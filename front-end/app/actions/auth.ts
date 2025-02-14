import { loginResponseSchema, loginSchema } from '@/lib/schemas';

export async function loginUser(formData: FormData) {
    const emailOrUsername = formData.get('emailOrUsername') as string;
    const password = formData.get('password') as string;

    // Validate the form data
    const parsedFormData = loginSchema.parse({
        emailOrUsername,
        password
    });

    try {
        const body ={email: parsedFormData.emailOrUsername, password: parsedFormData.password};

        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(body),
        });

        if (response.ok) {
            const data = await response.json();
            // Validate the response data
            const parsedResponse = loginResponseSchema.parse(data);

            console.log(parsedResponse.message); // Now this is type-safe
            return { success: true };
        } else {
            return { error: 'Invalid credentials' };
        }
    } catch (error) {
        console.error(error)
        return { error: 'An error occurred. Please try again.' };
    }
}
