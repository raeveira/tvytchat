import {Request, Response} from 'express';
import {EnvConfig} from "@config/Env.Config";
import jwt from "jsonwebtoken";

export class AuthConfig {
    private envConfig: EnvConfig;

    constructor(envConfig: EnvConfig) {
        this.envConfig = envConfig;
    }

    public checkAuth = async (req: Request) => {
        try {
            // Extract the token from the cookie
            const token = req.cookies['AuthToken'];

            if (!token) {
                return {message: 'No token provided', isAuthenticated: false, code: 204};
            }

            // Verify the token
            const decoded = jwt.verify(token, this.envConfig.get('JWT_SECRET'));

            // If verification is successful, the user is authenticated
            return {message: 'Authenticated', isAuthenticated: true, user: decoded, code: 200};
        } catch (error) {
            console.error('Authentication error:', error);
            return {message: 'Invalid token', isAuthenticated: false, code: 400};
        }
    }
}