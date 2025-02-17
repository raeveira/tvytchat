'use server'
import {loginResponseSchema, loginSchema} from '@/lib/schemas';

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

        console.log(response);

        if (response.ok) {
            const data = await response.json();

            console.log(data); // This is not type-safe

            // Validate the response data
            const parsedResponse = loginResponseSchema.parse(data);

            console.log(parsedResponse.message); // Now this is type-safe

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
