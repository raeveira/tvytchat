console.log('Prisma Database loaded');

import {PrismaClient} from '@prisma/client';

export class PrismaDatabase {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();

        this.prisma.$connect().then(() => {
            console.log('Connected to database');
        }).catch((error) => {
            console.error('Failed to connect to database');
            console.error(error);

            process.exit(1);
        });
    }

    public async close() {
        await this.prisma.$disconnect();
    }

    public async getUserByUsername(username: string) {
        return this.prisma.user.findUnique({
            where: {
                username: username
            },
            select: {
                email: true,
                username: true,
                password: true,
                role: true
            }
        });
    }

    public async getUserByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: {
                email: email
            },
            select: {
                email: true,
                username: true,
                password: true,
                role: true
            }
        })
    }

    public async getChatIdBySessionId(sessionUsername: string) {
        return this.prisma.user.findUnique({
            where: {
                username: sessionUsername
            },
            select: {
                chatId: true
            }
        });
    }

    public async insertUser(data: { email: string, username: string, name?: string, password: string, role?: string }) {
        return this.prisma.user.create({
            data: data
        });
    }

    public async getTwitchAccessToken(username: string) {
        return this.prisma.user.findUnique({
            where: {
                username: username
            },
            select: {
                twitchToken: true
            }
        })
    }

    public async getYoutubeAccessToken(username: string) {
        return this.prisma.user.findUnique({
            where: {
                username: username
            },
            select: {
                youtubeToken: true
            }
        })
    }

    public async getYoutubeRefreshToken(username: string) {
        return this.prisma.user.findUnique({
            where: {
                username: username
            },
            select: {
                youtubeRefreshToken: true
            }
        })
    }

    public async deleteYoutubeToken(username: string) {
        return this.prisma.user.update({
            where: {
                username: username
            },
            data: {
                youtubeToken: null
            }
        });
    }

    public async updateYoutubeAccessToken(username: string, accessToken: string) {
        return this.prisma.user.update({
            where: {
                username: username
            },
            data: {
                youtubeToken: accessToken
            }
        });
    }

    public async storeYoutubeTokens(username: string, accessToken: string, refreshToken: string) {
        return this.prisma.user.update({
            where: {
                username: username
            },
            data: {
                youtubeToken: accessToken,
                youtubeRefreshToken: refreshToken
            }
        });
    }

    public async storeTwitchToken(username: string, accessToken: string) {
        return this.prisma.user.update({
            where: {
                username: username
            },
            data: {
                twitchToken: accessToken
            }
        });
    };

    public async getUserByChatId(chatId: string) {
        return this.prisma.user.findUnique({
            where: {
                chatId: chatId
            },
            select: {
                username: true
            }
        });
    }
}