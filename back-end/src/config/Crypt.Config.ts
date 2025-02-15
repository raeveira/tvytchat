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

    public encrypt = async (data: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            try {
                this.iv = crypto.randomBytes(16);

                const key = crypto.createHash('sha512')
                    .update(this.secretKey)
                    .digest('hex')
                    .substring(0, 64);

                const cipher = crypto.createCipheriv(this.algorithm, Buffer.from(key, 'hex'), this.iv);
                let encrypted = cipher.update(data, 'utf8', 'hex');
                encrypted += cipher.final('hex');

                // Package the IV and encrypted data together
                const encryptedData = `${this.iv.toString('hex')}:${encrypted}`;
                resolve(encryptedData);
            } catch (error) {
                reject(error);
            }
        });
    }

    public decrypt = async (encryptedData: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            try {
                const [ivHex, encrypted] = encryptedData.split(':');
                console.log(`IV Hex: ${ivHex}`); // Debugging: Check IV hex string
                const iv = Buffer.from(ivHex, 'hex');
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

                resolve(decrypted);
            } catch (error) {
                reject(error);
            }
        });
    }

}
