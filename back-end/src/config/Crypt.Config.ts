import crypto from 'crypto';
import {EnvConfig} from "@config/Env.Config";

export class CryptConfig {
    private envConfig: EnvConfig;
    private algorithm = 'aes-256-cbc';
    private secretKey: string;
    private iv: Buffer | undefined;

    constructor(EnvConfig: EnvConfig) {
        this.envConfig = EnvConfig;
        this.secretKey = this.envConfig.get('CRYPT_SECRET_KEY');
    }

    public async encrypt(data: string): Promise<string> {
        try {
            const iv = crypto.randomBytes(16);

            const key = crypto.createHash('sha512')
                .update(this.secretKey)
                .digest('hex')
                .substring(0, 64);

            const cipher = crypto.createCipheriv(this.algorithm, Buffer.from(key, 'hex'), iv);
            let encrypted = cipher.update(data, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            // Package the IV and encrypted data together
            const encryptedData = `${iv.toString('hex')}:${encrypted}`;
            return encryptedData;
        } catch (error) {
            throw error; // Or handle it as needed
        }
    }

    public async decrypt(encryptedData: string): Promise<string> {
        try {
            const parts = encryptedData.split(':');

            // Check if the IV and encrypted data are correctly separated
            if (parts.length !== 2) {
                throw new Error('Invalid encrypted data format');
            }

            const ivHex = parts[0];
            const encrypted = parts[1];

            // Validate IV hex string length
            if (ivHex.length !== 32) {
                throw new Error(`Invalid IV length: Expected 32 characters, got ${ivHex.length}`);
            }

            // Validate IV hex string content
            if (!/^[0-9a-fA-F]+$/.test(ivHex)) {
                throw new Error('Invalid IV hex string');
            }

            const iv = Buffer.from(ivHex, 'hex');
            console.log(`IV Hex: ${ivHex}`); // Debugging: Check IV hex string
            console.log(`IV Length: ${iv.length}`); // Debugging: Check IV length

            if (iv.length !== 16) {
                throw new Error('Invalid IV length');
            }

            const key = crypto.createHash('sha512')
                .update(this.secretKey)
                .digest('hex')
                .substring(0, 64);

            const decipher = crypto.createDecipheriv(this.algorithm, Buffer.from(key, 'hex'), iv);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            throw error; // Or handle it as needed
        }
    }


}
