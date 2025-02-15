import {TwitchController} from "@controllers/Twitch.Controller";
import {YoutubeController} from "@controllers/Youtube.Controller";
import {AuthConfig} from "@config/Auth.Config";
import {Request, Response} from "express";
import {Server} from "socket.io";
import {PrismaDatabase} from "@database/Prisma.Database";
import {EnvConfig} from "@config/Env.Config";
import {CryptConfig} from "@config/Crypt.Config";

console.log('Main Controller loaded');

export class MainController {
    private authConfig: AuthConfig;
    private readonly io: Server;
    private readonly db: PrismaDatabase;
    private chatControllers: Map<string, { twitch: TwitchController; youtube: YoutubeController }>;
    private readonly envConfig: EnvConfig;
    private readonly cryptConfig: CryptConfig;

    constructor(AuthConfig: AuthConfig, io: Server, db: PrismaDatabase, EnvConfig: EnvConfig, CryptConfig: CryptConfig) {
        this.authConfig = AuthConfig;
        this.io = io;
        this.db = db;
        this.chatControllers = new Map();
        this.envConfig = EnvConfig;
        this.cryptConfig = CryptConfig;

        // Handle Socket.IO connections
        this.io.on("connection", (socket) => {
            console.log(`Socket ${socket.id} connected`);

            socket.on("joinRoom", (chatId) => {
                console.log(`Socket ${socket.id} joined room ${chatId}`);
                socket.join(chatId);

                // Ensure controllers exist for this chatId
                if (!this.chatControllers.has(chatId)) {
                    const twitchController = new TwitchController(this.io, this.db, this.envConfig, this.cryptConfig, null);
                    const youtubeController = new YoutubeController(this.io, this.db, this.envConfig, this.cryptConfig, null);
                    this.chatControllers.set(chatId, {twitch: twitchController, youtube: youtubeController});
                }
            });

            socket.on("disconnect", () => {
                console.log(`Socket ${socket.id} disconnected`);
            });
        });
    }

    public greeter = (req: any, res: any) => {
        res.send('Welcome to the API!');
    };

    private async getChatId(sessionUsername: string): Promise<{ message: string; code: number } | string> {
        const response = await this.db.getChatIdBySessionId(sessionUsername);
        if (!response?.chatId) {
            return {message: "Chat ID not found", code: 404};
        } else {
            return response.chatId;
        }
    }

    private async extractChatId(url: string): Promise<string | null> {
        console.log("URL:", url);

        // Parse the URL to extract the query string
        const parsedUrl = new URL(`http://example.com${url}`); // Add a base URL to make it valid
        const urlParams = new URLSearchParams(parsedUrl.search);
        console.log("URL Params:", urlParams);
        console.log("Chat ID:", urlParams.get("chatId"));
        return urlParams.get("chatId") || null;
    }

    public getStreamMessages = async (req: Request, res: Response) => {
        let sessionUsername;
        let chatId = await this.extractChatId(req.url);

        console.log("Chat ID:", chatId);

        if (chatId) {
            const user = await this.db.getUserByChatId(chatId);

            if (!user) {
                return res.status(404).json({message: "Chat does not exist", errorType: "NotFound"});
            }

            sessionUsername = user.username;
        } else {
            const authResponse = await this.authConfig.checkAuth(req);

            console.log("Auth response: ", authResponse);

            if (!authResponse.isAuthenticated) {
                if (authResponse.code) {
                    return res.status(authResponse.code).json({
                        message: authResponse.message,
                        errorType: "ServerError"
                    });
                }
                console.log(authResponse.message)
                return res.status(401).json({message: "Unauthorized", errorType: "Unauthorized"});
            }

            const user = authResponse.user;

            if (typeof user === "string") {
                sessionUsername = user;
            } else if (typeof user === "object" && user !== null && "username" in user) {
                sessionUsername = user.username.toString();
            } else {
                return {message: "Invalid user data", errorType: "BadRequest", code: 400};
            }

            if (!sessionUsername) {
                return {message: "Username is required", errorType: "BadRequest", code: 400};
            }

            const chatIdResponse = await this.getChatId(sessionUsername);

            if (typeof chatIdResponse !== "string") {
                return {message: chatIdResponse.message, errorType: "ServerError", code: chatIdResponse.code};
            }

            chatId = chatIdResponse as string;
        }

        console.log("Chat ID:", chatId);

        console.log("Retrieving stream messages");

        // Ensure controllers exist for this chatId
        if (!this.chatControllers.has(chatId)) {
            const twitchController = new TwitchController(this.io, this.db, this.envConfig, this.cryptConfig, null);
            const youtubeController = new YoutubeController(this.io, this.db, this.envConfig, this.cryptConfig, null);
            this.chatControllers.set(chatId, {twitch: twitchController, youtube: youtubeController});
        }

        const chatControllers = this.chatControllers.get(chatId);

        if (chatControllers) {
            let twitchresponse = false;
            let youtuberesponse = false;

            chatControllers.twitch.getStreamMessages(chatId, sessionUsername).then((data) => {
                console.log("Twitch Response:", data);
                if (data.code == 200) {
                    twitchresponse = true;
                }
            });

            chatControllers.youtube.getStreamMessages(chatId, sessionUsername).then((data) => {
                console.log("Youtube Response:", data);
                if (data.code == 200) {
                    youtuberesponse = true;
                }
            });

            if (twitchresponse && youtuberesponse) {
                res.status(200).json({message: "Stream messages are being sent", errorType: "None"});
            }
        }
    };
}
