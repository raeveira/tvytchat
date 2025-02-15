import {PrismaDatabase} from "@database/Prisma.Database";
import {Server, Socket} from "socket.io";
import {Response} from "express";
import {LiveChat} from "youtube-chat";
import {EnvConfig} from "@config/Env.Config";
import {CryptConfig} from "@config/Crypt.Config";

console.log('Youtube Controller loaded');

export class YoutubeController {
    private io: Server;
    private db: PrismaDatabase;
    private youtubeClient: LiveChat | undefined;
    private envConfig: EnvConfig;
    private cryptConfg: CryptConfig;
    private socket: Socket | null;

    constructor(io: Server, db: PrismaDatabase, EnvConfig: EnvConfig, CryptConfig: CryptConfig, Socket: Socket | null) {
        this.io = io;
        this.db = db;
        this.envConfig = EnvConfig;
        this.cryptConfg = CryptConfig
        this.socket = Socket;
    }

    private async initYoutube(username: string, chatId: string) {
        const accessToken = await this.db.getYoutubeAccessToken(username);
        const refreshToken = await this.db.getYoutubeRefreshToken(username);

        if (!accessToken?.youtubeToken) {
            return {message: "User has no Youtube token", code: 404};
        }

        if(!refreshToken?.youtubeRefreshToken) {
            return {message: "User has no Youtube refresh token", code: 404};
        }

        const decryptedAccessToken = await this.cryptConfg.decrypt(accessToken?.youtubeToken);
        const decryptedRefreshToken = await this.cryptConfg.decrypt(refreshToken?.youtubeRefreshToken);

        if (this.youtubeClient) {
            return {message: "Youtube client already initialized", code: 200};
        } else {
            const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=id&mine=true`, {
                headers: {
                    Authorization: "Bearer " + decryptedAccessToken,
                    'Accept': 'application/json',
                }
            });

            const data = await response.json();

            if (data.error) {
                if (data.error.code === 401) {
                    // Token expired, refresh it
                    if(!decryptedRefreshToken) {
                        await this.db.deleteYoutubeToken(username);
                        return {message: 'Refresh token not found', code: 401};
                    }

                    const newAccessToken = await this.refreshAccessToken(decryptedRefreshToken);
                    if (!newAccessToken) {
                        await this.db.deleteYoutubeToken(username);
                        return {message: 'Failed to refresh token', code: 401};
                    }

                    const encryptAccessToken = await this.cryptConfg.encrypt(newAccessToken);

                    // Update stored token
                    await this.db.updateYoutubeAccessToken(username, encryptAccessToken);
                    // Retry with new token
                    await this.initYoutube(username, chatId);
                }
                return {message: data.error.message, code: 500};
            }

            let channelId;

            if (data.items && data.items.length > 0) {
                channelId = data.items[0].id;
            } else {
                return null;
            }

            console.log("Youtube Channel ID:", channelId);

            this.youtubeClient = new LiveChat({channelId});

            this.youtubeClient.on('start', (liveId) => {
                console.log('Youtube live started:', liveId);
            });

            this.youtubeClient.on('end', () => {
                console.log('Youtube live ended');
            });

            this.youtubeClient.on('chat', (chatItem) => {
                console.log('Youtube message:', chatItem);

                const icon = {};

                if (chatItem.isOwner) {
                    // @ts-expect-error
                    icon.broadcaster = "1"
                }

                if (chatItem.isMembership) {
                    // @ts-expect-error
                    icon.subscriber = "1"
                }

                console.log('Youtube Badges:', icon);

                const message = {
                    platform: 'YouTube',
                    username: chatItem.author.name,
                    icon,
                    // @ts-expect-error
                    message: chatItem.message[0].text
                };

                console.log('Chat Message:', message);
                this.io.to(chatId).emit('chat', [message]);
            });

            this.youtubeClient.on('error', (error) => {
                console.error('Youtube error:', error);
                this.io.to(chatId).emit('error', error);
            });

            try {
                const ok = await this.youtubeClient.start();
                if (!ok) {
                    this.io.to(chatId).emit('error', {
                        message: 'Failed to start Youtube chat',
                        code: 500,
                        platform: 'YouTube'
                    });
                    this.youtubeClient = undefined;
                    console.log('Failed to connect to Youtube');
                } else {
                    this.io.to(chatId).emit('success', {
                        message: 'Youtube chat started',
                        code: 200,
                        platform: 'YouTube'
                    });
                    console.log('Connected to Youtube');
                    return {message: 'Youtube chat started', code: 200};
                }
            } catch (error) {
                this.io.to(chatId).emit('error', error);
            }


        }

    }

    // Method to refresh access token using refresh token
    private async refreshAccessToken(refreshToken: string): Promise<string | null> {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `grant_type=refresh_token&refresh_token=${refreshToken}&client_id=${this.envConfig.get('YOUTUBE_CLIENT_ID')}&client_secret=${this.envConfig.get('YOUTUBE_CLIENT_SECRET')}`,
        });

        const data = await response.json();

        if (data.error) {
            console.error('Error refreshing token:', data.error);
            return null;
        }

        return data.access_token;
    }

    public async getStreamMessages(chatId: string, sessionUsername: string) {

        const response = await this.initYoutube(sessionUsername, chatId);

        console.log("Init Youtube Response:", response);

        if (response == undefined) {
            this.io.to(chatId).emit("error", {message: "Youtube not started", code: 500});
            return {message: "Youtube not started", errorType: "ServerError", code: 500};
        }

        if (response.code !== 200) {
            this.io.to(chatId).emit("error", {message: response.message, code: response.code});
            return {message: response.message, errorType: "ServerError", code: 500};
        }

        console.log("Youtube messages are being sent");
        return {message: "Stream messages are being sent", errorType: "", code: 200};
    }
}