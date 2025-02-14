import { z } from 'zod';

export const loginSchema = z.object({
    emailOrUsername: z.string(),
    password: z.string(),
});

export const loginResponseSchema = z.object({
    message: z.string(),
    errorType: z.string(),
});
