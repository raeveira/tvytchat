import dotenv from 'dotenv';

export class EnvConfig {
    constructor() {
        dotenv.config();
    }

    public get(key: string): string {
        return process.env[key] || '';
    }
}