import {EnvConfig} from "@config/Env.Config";
import {Server} from "socket.io";
import {PrismaDatabase} from "@/database/Prisma.Database";
import tmi from "tmi.js";
import {Response} from "express";
import {CryptConfig} from "@config/Crypt.Config";

console.log("Twitch Controller loaded");

export class TwitchController {
    private io: Server;
    private db: PrismaDatabase;
    private envConfig: EnvConfig;
    private twitchClient: tmi.Client | undefined;
    private cryptConfig: CryptConfig;

    constructor(io: Server, db: PrismaDatabase, EnvConfig: EnvConfig, CryptConfig: CryptConfig) {
        this.io = io;
        this.db = db;
        this.envConfig = EnvConfig;
        this.cryptConfig = CryptConfig;
    }

    private async initTwitch(username: string, chatId: string): Promise<{ message: string; code: number } | undefined> {
        const accessToken = await this.db.getTwitchAccessToken(username);

        if (!accessToken?.twitchToken) {
            return {message: "User has no twitch token", code: 404};
        }

        const decryptedAccessToken = this.cryptConfig.decrypt(accessToken?.twitchToken);


        const twitchClientId = this.envConfig.get("TWITCH_CLIENT_ID");

        if (this.twitchClient) {
            return {message: "Twitch client already initialized", code: 200};
        } else {
            const response = await fetch("https://api.twitch.tv/helix/users", {
                headers: {
                    Authorization: "Bearer " + decryptedAccessToken,
                    "Client-ID": twitchClientId,
                },
            });

            const data = await response.json();

            if (data.error) {
                return {message: data.message, code: data.status};
            }

            this.twitchClient = new tmi.Client({
                options: {debug: true},
                connection: {
                    secure: true,
                    reconnect: true,
                },
                identity: {
                    username: data.data[0].login,
                    password: `oauth:${decryptedAccessToken}`,
                },
                channels: [data.data[0].login],
            });

            // Emit messages immediately when they are received
            this.twitchClient.on("message", (channel, tags, message, self) => {
                console.log("Twitch Badges:", tags.badges);

                const chatMessage = {
                    platform: "Twitch",
                    icon: tags.badges || {},
                    username: tags["display-name"],
                    message: message,
                };

                console.log("Chat Message:", chatMessage);
                console.log("Chat ID:", chatId);
                this.io.to(chatId).emit("chat", [chatMessage]);
            });

            try {
                const ok = await this.twitchClient.connect();
                if (!ok) {
                    this.io.to(chatId).emit("error", [{
                        message: "Failed to connect to Twitch",
                        code: 500,
                        platform: "Twitch"
                    }]);
                } else {
                    this.io.to(chatId).emit("success", {message: 'Twitch chat started', code: 200, platform: 'Twitch'});
                    console.log("Connected to Twitch");
                }
            } catch (error) {
                this.io.to(chatId).emit("error", [{
                    message: "Failed to connect to Twitch",
                    code: 500,
                    platform: "Twitch"
                }]);
            }
        }

        return {message: "Twitch connected", code: 200};
    }

    public async getStreamMessages(chatId: string, sessionUsername: string) {

        const response = await this.initTwitch(sessionUsername, chatId);

        console.log("Init Twitch Response:", response);

        if (response && response.code !== 200) {
            return {message: response.message, errorType: "ServerError", code: 500};
        }
        console.log("Twitch messages are being sent");
        this.io.to(chatId).emit("success", {
            message: "Twitch Connected",
            code: 200
        })
        return {message: "Stream messages are being sent", errorType: "", code: 200};
    }
}
