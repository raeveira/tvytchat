import type {NextRequest} from 'next/server';
import {NextResponse} from 'next/server';
import routes from '@/routes.json';

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Allow API routes without authentication
    if (routes.api.some(route => path.startsWith(route))) {
        return NextResponse.next();
    }

    // Allow public routes without authentication
    if (routes.public.some(route => path.startsWith(route))) {
        return NextResponse.next();
    }

    // Validate token with backend API for all other routes
    try {
        const response = await fetch('http://localhost:3000/api/auth/check-token', {
            method: 'GET',
            headers: {
                'Cookie': request.headers.get('cookie') || ''
            },
        });

        const {isAuthenticated} = await response.json();

        if (!response.ok || !isAuthenticated) {
            // User is not authenticated, redirect to login unless already on an auth route
            if (!routes.auth.some(route => path.startsWith(route))) {
                return NextResponse.redirect(new URL('/login', request.url));
            }
        } else {
            // User is authenticated, redirect to dashboard if on an auth route
            if (routes.auth.some(route => path.startsWith(route))) {
                return NextResponse.redirect(new URL('/dashboard', request.url));
            }
        }
    } catch (error) {
        console.error('Token validation error:', error);
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|favicon.ico).*)'],
};
