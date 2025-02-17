import type {NextRequest} from 'next/server';
import {NextResponse} from 'next/server';
import routes from '@/routes.json';

// Function to check if a path matches a route pattern
function pathMatchesRoute(path: string, route: string) {
    // For exact matches
    if (path === route) return true;

    // For routes with parameters (e.g., /chat/:id)
    if (route.includes('/:')) {
        const routeParts = route.split('/');
        const pathParts = path.split('/');

        if (routeParts.length > pathParts.length) return false;

        for (let i = 0; i < routeParts.length; i++) {
            if (routeParts[i] === pathParts[i]) continue;
            if (routeParts[i].startsWith(':')) continue;
            return false;
        }

        return true;
    }

    // Allow any path that starts with the route
    return path.startsWith(route);
}

export default async function middleware(request: NextRequest) {
    console.log("MIDDLEWARE INITIATED")

    const path = request.nextUrl.pathname;

    console.log("PATH:", path)

    // Allow API routes without authentication
    if (routes.api.some(route => pathMatchesRoute(path, route))) {
        console.log("API ROUTE")
        return NextResponse.next();
    }

    // Allow public routes without authentication
    if ((routes.public.some(route => pathMatchesRoute(path, route)) && path !== '/dashboard') || path.startsWith('/chat')) {
        console.log("PUBLIC ROUTE")
        return NextResponse.next();
    }


    // Allow auth routes without authentication
    if (routes.auth.some(route => pathMatchesRoute(path, route))) {
        console.log("AUTH ROUTE")
        return NextResponse.next();
    }

    // Validate token with backend API for all other routes
    try {
        const response = await fetch('https://tvytapi.raeveira.nl/api/auth/check-token', {
            method: 'GET',
            headers: {
                'Cookie': request.headers.get('cookie') || ''
            },
            credentials: 'include',
        });

        const {isAuthenticated} = await response.json();

        console.log('isAuthenticated:', isAuthenticated);

        if (!response.ok || !isAuthenticated) {
            // User is not authenticated, redirect to login unless already on an auth route
            if (!routes.auth.some(route => pathMatchesRoute(path, route))) {
                return NextResponse.redirect(new URL('/login', request.url));
            }
        } else {
            // User is authenticated, redirect to dashboard if on an auth route
            if (routes.auth.some(route => pathMatchesRoute(path, route))) {
                return NextResponse.redirect(new URL('/dashboard', request.url));
            }
        }
    } catch (error) {
        console.error('Token validation error:', error);
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Deny all other routes without authentication
    return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
    matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)'],
};
