import {TwitchController} from "@controllers/Twitch.Controller";
import {YoutubeController} from "@controllers/Youtube.Controller";
import {AuthConfig} from "@config/Auth.Config";
import {Request, Response} from "express";
import {Server} from "socket.io";
import {PrismaDatabase} from "@database/Prisma.Database";

console.log('Main Controller loaded');

export class MainController {
    private twitchController: TwitchController;
    private youtubeController: YoutubeController;
    private authConfig: AuthConfig;
    private io: Server;
    private db: PrismaDatabase;

    constructor(TwitchController: TwitchController, YoutubeController: YoutubeController, AuthConfig: AuthConfig, io: Server, db: PrismaDatabase) {
        this.twitchController = TwitchController;
        this.youtubeController = YoutubeController;
        this.authConfig = AuthConfig;
        this.io = io;
        this.db = db;
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
            const authResponse = await this.authConfig.checkAuth(req, res);

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

        let twitchresponse = false;
        let youtuberesponse = false;

        await this.twitchController.getStreamMessages(chatId, sessionUsername, res).then((data) => {
            console.log("Twitch Response:", data);
            if (data.code == 200) {
                twitchresponse = true;
            }
        });

        await this.youtubeController.getStreamMessages(chatId, sessionUsername, res).then((data) => {
            console.log("Youtube Response:", data);
            if (data.code == 200) {
                youtuberesponse = true;
            }
        });

        if (twitchresponse || youtuberesponse) {
            console.log("Connecting Socket.IO");
            // Handle Socket.IO connections
            this.io.on("connection", (socket) => {
                console.log(`Socket ${socket.id} connected`);
                socket.join(chatId);
                console.log(`Socket ${socket.id} joined room ${chatId}`);

                socket.on("disconnect", () => {
                    console.log(`Socket ${socket.id} disconnected from room ${chatId}`);
                    socket.leave(chatId);
                });

                socket.on("leaveRoom", (roomId) => {
                    if (roomId === chatId) {
                        console.log(`Socket ${socket.id} left room ${roomId}`);
                        socket.leave(roomId);
                    }
                });
            });
        }

        if (twitchresponse && youtuberesponse) {
            return res.status(200).json({message: "Stream messages are being sent", errorType: "None"});
        }
    };
}