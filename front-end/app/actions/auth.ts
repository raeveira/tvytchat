'use server'
import {loginResponseSchema, loginSchema} from '@/lib/schemas';
import {cookies} from 'next/headers';

export async function loginUser(formData: FormData) {
    const emailOrUsername = formData.get('emailOrUsername') as string;
    const password = formData.get('password') as string;

    // Validate the form data
    const parsedFormData = loginSchema.parse({
        emailOrUsername,
        password
    });

    try {
        const body = {email: parsedFormData.emailOrUsername, password: parsedFormData.password};

        const response = await fetch('https://tvytapi.raeveira.nl/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(body),
        });

        if (response.ok) {
            const cookieStore = await cookies();
            const setCookieHeader = response.headers.get('Set-Cookie');

            if (setCookieHeader) {
                const cookies = setCookieHeader.split(','); // Split multiple cookies if present
                cookies.forEach((cookie) => {
                    const [cookieValue, ...attributes] = cookie.split(';').map((part) => part.trim());
                    const [key, value] = cookieValue.split('=');

                    // Set the cookie with its attributes
                    cookieStore.set(key, value, {
                        httpOnly: attributes.some((attr) => attr.toLowerCase() === 'httponly'),
                        secure: attributes.some((attr) => attr.toLowerCase() === 'secure'),
                        sameSite: attributes.find((attr) => attr.toLowerCase().startsWith('samesite'))?.split('=')[1]?.toLowerCase() as 'lax' | 'strict' | 'none' || 'none',
                        path: attributes.find((attr) => attr.toLowerCase().startsWith('path'))?.split('=')[1] || '/',
                    });
                });
            }


            const data = await response.json();


            // Validate the response data
            const parsedResponse = loginResponseSchema.parse(data);

            // Get all response headers
            const responseHeaders = Object.fromEntries(response.headers.entries());

            return Promise.resolve({
                message: parsedResponse.message,
                errorType: parsedResponse.errorType,
                headers: responseHeaders
            });

        } else {
            return {error: 'Invalid credentials'};
        }
    } catch (error) {
        console.error(error)
        return {error: 'An error occurred. Please try again.'};
    }
}
