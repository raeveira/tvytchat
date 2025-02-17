import type {NextRequest} from 'next/server';
import {NextResponse} from 'next/server';
import {
    DEFAULT_LOGIN_REDIRECT,
    apiAuthPrefix,
    authRoutes,
    publicRoutes
} from "@/lib/routes"

const checkAuth = async (request: NextRequest) => {
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

        return isAuthenticated;
    } catch (error) {
        console.error('Token validation error:', error);
        return NextResponse.redirect(new URL('/login', request.url));
    }
};

export default async function middleware(request: NextRequest) {
    const {nextUrl} = request;
    const isLoggedIn = !!await checkAuth(request);

    console.log('isLoggedIn:', isLoggedIn);
    console.log('nextUrl:', nextUrl.pathname);

    const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);
    const isPublicRoute = publicRoutes.includes(nextUrl.pathname);
    const isAuthRoute = authRoutes.includes(nextUrl.pathname);

    if (isApiAuthRoute) {
        return null;
    }

    if (isAuthRoute) {
        if (isLoggedIn) {
            return Response.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl))
        }
        return null;
    }

    if (!isLoggedIn && !isPublicRoute) {
        return Response.redirect(new URL("/", nextUrl));
    }

    return null;
}

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
}
