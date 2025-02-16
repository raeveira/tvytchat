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
    private cryptConfig: CryptConfig;
    private socket: Socket | null;
    private reconnectAttempts = 0;
    private reconnectDelays = [30000, 60000, 120000];

    constructor(io: Server, db: PrismaDatabase, EnvConfig: EnvConfig, CryptConfig: CryptConfig, Socket: Socket | null) {
        this.io = io;
        this.db = db;
        this.envConfig = EnvConfig;
        this.cryptConfig = CryptConfig
        this.socket = Socket;
    }

    private async initYoutube(username: string, chatId: string) {
        const accessToken = await this.db.getYoutubeAccessToken(username);
        const refreshToken = await this.db.getYoutubeRefreshToken(username);

        if (!accessToken?.youtubeToken) {
            return {message: "User has no Youtube token", code: 404};
        }

        if (!refreshToken?.youtubeRefreshToken) {
            return {message: "User has no Youtube refresh token", code: 404};
        }

        const decryptedAccessToken = await this.cryptConfig.decrypt(accessToken?.youtubeToken);
        const decryptedRefreshToken = await this.cryptConfig.decrypt(refreshToken?.youtubeRefreshToken);

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
                    if (!decryptedRefreshToken) {
                        await this.db.deleteYoutubeToken(username);
                        return {message: 'Refresh token not found', code: 401};
                    }

                    const newAccessToken = await this.refreshAccessToken(decryptedRefreshToken);
                    if (!newAccessToken) {
                        await this.db.deleteYoutubeToken(username);
                        return {message: 'Failed to refresh token', code: 401};
                    }

                    const encryptAccessToken = await this.cryptConfig.encrypt(newAccessToken);

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


            this.youtubeClient = new LiveChat({channelId});

            this.youtubeClient.on('start', (liveId) => {
                console.log('Youtube live started:', liveId);
            });

            this.youtubeClient.on('end', () => {
                console.log('Youtube live ended');
                this.reconnectYoutube(chatId, username);
            });

            this.youtubeClient.on('chat', (chatItem) => {

                const icon = {};

                if (chatItem.isOwner) {
                    // @ts-expect-error
                    icon.broadcaster = "1"
                }

                if (chatItem.isMembership) {
                    // @ts-expect-error
                    icon.subscriber = "1"
                }

                const message = {
                    platform: 'YouTube',
                    username: chatItem.author.name,
                    icon,
                    // @ts-expect-error
                    message: chatItem.message[0].text
                };

                this.io.to(chatId).emit('chat', [message]);
            });

            this.youtubeClient.on('error', (error) => {
                console.error('Youtube error:', error);
                this.io.to(chatId).emit('error', error);
                this.reconnectYoutube(chatId, username); // Attempt reconnect on error
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
                } else {
                    this.io.to(chatId).emit('success', {
                        message: 'Youtube chat started',
                        code: 200,
                        platform: 'YouTube'
                    });
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

    // Reconnect logic
    private async reconnectYoutube(chatId: string, username: string) {
        if (this.reconnectAttempts >= this.reconnectDelays.length) {
            console.log('Maximum reconnect attempts reached. Giving up.');
            this.io.to(chatId).emit('error', {
                message: 'Failed to reconnect to YouTube after multiple attempts.',
                code: 500,
                platform: 'YouTube'
            });
            return;
        }

        const delay = this.reconnectDelays[this.reconnectAttempts];
        console.log(`Attempting reconnect in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));

        try {
            await this.initYoutube(username, chatId);
            this.reconnectAttempts = 0;
        } catch (error) {
            console.error('Reconnect attempt failed:', error);
            this.reconnectAttempts++;
            await this.reconnectYoutube(chatId, username);
        }
    }

    public async getStreamMessages(chatId: string, sessionUsername: string) {

        const response = await this.initYoutube(sessionUsername, chatId);

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