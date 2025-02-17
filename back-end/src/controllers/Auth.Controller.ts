import {EnvConfig} from "@/config/Env.Config";
import {Request, Response} from 'express';
import {PrismaDatabase} from "@/database/Prisma.Database";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {Prisma} from "@prisma/client";
import {AuthConfig} from "@config/Auth.Config";
import {CryptConfig} from "@config/Crypt.Config";

console.log('Auth Controller loaded');

export class AuthController {
    private EnvConfig: EnvConfig;
    private readonly TWITCH_CLIENT_ID: string;
    private readonly TWITCH_REDIRECT_URI: string;
    private readonly TWITCH_SCOPES: string;
    private readonly YOUTUBE_CLIENT_ID: string;
    private readonly YOUTUBE_CLIENT_SECRET: string;
    private readonly YOUTUBE_REDIRECT_URI: string;
    private readonly YOUTUBE_SCOPES: string;
    private db: PrismaDatabase;
    private authConfig: AuthConfig;
    private cryptConfig: CryptConfig;

    constructor(EnvConfig: EnvConfig, db: PrismaDatabase, AuthConfig: AuthConfig, CryptConfig: CryptConfig) {
        this.EnvConfig = EnvConfig;
        this.TWITCH_CLIENT_ID = this.EnvConfig.get('TWITCH_CLIENT_ID');
        this.TWITCH_REDIRECT_URI = this.EnvConfig.get('TWITCH_REDIRECT_URI');
        this.TWITCH_SCOPES = this.EnvConfig.get('TWITCH_SCOPES');
        this.YOUTUBE_CLIENT_ID = this.EnvConfig.get('YOUTUBE_CLIENT_ID');
        this.YOUTUBE_CLIENT_SECRET = this.EnvConfig.get('YOUTUBE_CLIENT_SECRET');
        this.YOUTUBE_REDIRECT_URI = this.EnvConfig.get('YOUTUBE_REDIRECT_URI');
        this.YOUTUBE_SCOPES = this.EnvConfig.get('YOUTUBE_SCOPES');
        this.db = db;
        this.authConfig = AuthConfig;
        this.cryptConfig = CryptConfig;
    }

    public async twitchAuth(req: Request, res: Response) {
        const authenticated = await this.authConfig.checkAuth(req);

        if (!authenticated.isAuthenticated) {
            return res.status(authenticated.code).send(authenticated.message);
        }

        const authUrl = `https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=${this.TWITCH_CLIENT_ID}&redirect_uri=${this.TWITCH_REDIRECT_URI}&scope=${this.TWITCH_SCOPES}`;
        res.redirect(authUrl);
    }

    public async youtubeAuth(req: Request, res: Response) {
        const authenticated = await this.authConfig.checkAuth(req);

        if (!authenticated.isAuthenticated) {
            return res.status(authenticated.code).send(authenticated.message);
        }

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${this.YOUTUBE_CLIENT_ID}&redirect_uri=${this.YOUTUBE_REDIRECT_URI}&response_type=code&scope=${this.YOUTUBE_SCOPES}&access_type=offline&prompt=consent`;
        res.redirect(authUrl);
    }

    public async handleTwitchRedirect(req: Request, res: Response) {
        const accessToken = req.query.access_token;
        const tokenType = req.query.token_type;

        if (!accessToken || !tokenType) {
            return res.status(400).send('No access token provided');
        }

        const authenticated = await this.authConfig.checkAuth(req);

        if (!authenticated.isAuthenticated) {
            return res.status(authenticated.code).send(authenticated.message);
        }

        try {
            // Encrypt access token
            const encryptedAccessToken = await this.cryptConfig.encrypt(accessToken.toString());

            // Store access token securely
            //@ts-expect-error
            await this.db.storeTwitchToken(authenticated.user?.username, encryptedAccessToken);

            res.redirect('https://tvyt.raeveira.nl/dashboard?auth=success');
        } catch (error) {
            console.error('Error handling redirect:', error);
            res.status(500).send('Internal Server Error');
        }
    }

    public async handleYoutubeRedirect(req: Request, res: Response) {
        const code = req.query.code;

        if (!code) {
            return res.status(400).send('No authorization code provided');
        }

        const authenticated = await this.authConfig.checkAuth(req);

        if (!authenticated.isAuthenticated) {
            return res.status(authenticated.code).send(authenticated.message);
        }

        try {
            const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `grant_type=authorization_code&code=${code}&redirect_uri=${this.YOUTUBE_REDIRECT_URI}&client_id=${this.YOUTUBE_CLIENT_ID}&client_secret=${this.YOUTUBE_CLIENT_SECRET}`,
            });

            const data = await response.json();

            if (data.error) {
                console.error('Error exchanging code for token:', data.error);
                return res.status(500).send('Failed to exchange code for token');
            }

            // Encrypt access token and refresh token
            const encryptedAccessToken = await this.cryptConfig.encrypt(data.access_token);
            const encryptedRefreshToken = await this.cryptConfig.encrypt(data.refresh_token);

            // Store access token and refresh token securely
            //@ts-expect-error
            await this.db.storeYoutubeTokens(authenticated.user?.username, encryptedAccessToken, encryptedRefreshToken);

            res.redirect('https://tvyt.raeveira.nl/dashboard?auth=success');
        } catch (error) {
            console.error('Error handling redirect:', error);
            res.status(500).send('Internal Server Error');
        }
    }


    public async login(req: Request, res: Response) {
        const user = {
            username: req.body.username,
            email: req.body.email,
            password: req.body.password
        }

        let dbUser;

        // Authenticate user
        if (user.username) {
            dbUser = await this.db.getUserByUsername(user.username);
        } else if (user.email) {
            dbUser = await this.db.getUserByEmail(user.email);
        }

        if (!dbUser) {
            return res.status(400).json({message: 'Invalid credentials', errorType: 'ClientError'});
        }

        const validPassword = await bcrypt.compare(user.password, dbUser.password);
        if (!validPassword) {
            return res.status(400).json({message: 'Invalid username or password', errorType: 'ClientError'});
        }

        try {
            // Generate token with expiration
            const token = jwt.sign(
                {username: dbUser.username, role: dbUser.role},
                this.EnvConfig.get('JWT_SECRET'),
                {expiresIn: '24h'} // Token expires in 1 hour
            );

            // Return token
            return res
                .status(200)
                .cookie('AuthToken', token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'none',
                    path: '/',
                })
                .header('Access-Control-Allow-Credentials', 'true')
                .json({message: 'Login successful', errorType: ''});
        } catch (error) {
            console.error('Error generating token:', error);
            res.status(500).json({message: 'Internal server error', errorType: 'ServerError'});
        }
    };

    public async register(req: Request, res: Response) {
        const data = req.body;
        let role;

        // validate data
        if (!data) {
            return res.status(400).json({message: 'No data given', errorType: 'ServerError'});
        }

        if (!data.email || !data.username || !data.password) {
            return res.status(400).json({message: 'Missing required form fields', errorType: 'ClientError'})
        }

        // hash password
        const hashedPassword = await bcrypt.hash(data.password, 12);

        if (!hashedPassword) {
            return res.status(500).json({message: 'Internal server error', errorType: 'ServerError'});
        }

        const token = req.cookies['AuthToken'];
        if (token) {
            try {
                // Verify token
                const decoded = jwt.verify(token, this.EnvConfig.get('JWT_SECRET'));

                if (typeof decoded !== 'string' && 'role' in decoded) {
                    // If the user is an admin, allow them to set the role
                    if (decoded.role === 'ADMIN' && data.role) {
                        role = data.role;
                    } else if (data.role) {
                        return res.status(403).json({
                            message: 'Forbidden: Only admins can set roles',
                            errorType: 'ServerError'
                        });
                    }
                } else {
                    // If the token is invalid or not a JwtPayload, return an error
                    if (data.role) {
                        return res.status(403).json({
                            message: 'Forbidden: Only admins can set roles',
                            errorType: 'ServerError'
                        });
                    }
                }
            } catch (err) {
                return res.status(401).json({message: 'Invalid or expired token', errorType: 'ServerError'});
            }
        } else if (data.role) {
            // If no token is provided and a role is specified, reject the request
            return res.status(403).json({message: 'Forbidden: Only admins can set roles', errorType: 'ServerError'});
        }

        // Insert data into the database
        try {
            const user = await this.db.insertUser({
                email: data.email,
                username: data.username,
                password: hashedPassword,
                name: data.name,
                role: role,
            });

            return res.status(201).json({
                message: 'User registered successfully',
                userId: user.id,
                username: user.username,
                errorType: ''
            });

        } catch (err) {
            if (err instanceof Prisma.PrismaClientKnownRequestError) {
                console.error('Caught Prisma error:', err);
                if (err.code === 'P2002') {
                    console.error('Sending 400 response for unique constraint violation');
                    return res.status(400).json({
                        message: 'Email or username already exists',
                        errorType: 'ClientError',
                    });
                }
            }

            console.error('Unexpected error during registration:', err);
            return res.status(500).json({message: 'Internal server error', errorType: 'ServerError'});
        }
    }

    public async checkAuth(req: Request, res: Response) {
        try {
            // Extract the token from the cookie
            const token = req.cookies['AuthToken'];

            if (!token) {
                return res.status(401).json({message: 'No token provided', isAuthenticated: false});
            }

            // Verify the token
            const decoded = jwt.verify(token, this.EnvConfig.get('JWT_SECRET'));

            // If verification is successful, the user is authenticated
            res.status(200).json({message: 'Authenticated', isAuthenticated: true, user: decoded});
        } catch (error) {
            console.error('Authentication error:', error);
            res.status(401).json({message: 'Invalid token', isAuthenticated: false});
        }
    }

    public async retrieveChatId(req: Request, res: Response) {
        let sessionUsername;
        let chatId;

        console.log("Retrieving ChatID from session, for Dashboard");

        const authenticated = await this.authConfig.checkAuth(req);

        console.log("Authenticated: ", authenticated);

        if (!authenticated.isAuthenticated) {
            return res.status(authenticated.code).send(authenticated.message);
        }

        const user = authenticated.user;

        console.log("User: ", user);

        if (user) {

            if (typeof user === "string") {
                sessionUsername = user;
            } else if (typeof user === "object" && "username" in user) {
                sessionUsername = user.username.toString();
            } else {
                return {message: "Invalid user data", errorType: "BadRequest", code: 400};
            }

            console.log("SessionUsername: ", sessionUsername);

            if (!sessionUsername) {
                return {message: "Username is required", errorType: "BadRequest", code: 400};
            }

            const chatIdResponse = await this.db.getChatIdBySessionId(sessionUsername);

            console.log("ChatID retrieved: ", chatIdResponse?.chatId);

            chatId = chatIdResponse?.chatId;

            return res.status(200).json({chatId: chatId});
        } else {
            return res.status(400).json({message: 'Invalid user data', errorType: 'BadRequest'});
        }
    }

}