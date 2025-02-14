import crypto from 'crypto';
import {EnvConfig} from "@config/Env.Config";

export class CryptConfig {
    private envConfig: EnvConfig;
    private algorithm = 'aes-256-cbc';
    private secretKey: string;
    private readonly iv: Buffer;

    constructor(EnvConfig: EnvConfig) {
        this.envConfig = EnvConfig;
        this.secretKey = this.envConfig.get('CRYPT_SECRET_KEY');

        this.iv = crypto.randomBytes(16);
    }

    public encrypt = async (data: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            try {
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
                const iv = Buffer.from(ivHex, 'hex');

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
