'use server'
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const searchParams = url.searchParams;

  const code = searchParams.get('code');
  const scope = searchParams.get('scope');

  if (!code || !scope) {
    return new Response('Missing required parameters', { status: 400 });
  }

  const newUrl = `http://localhost:3000/api/auth/youtube-redirect?code=${code}&scope=${scope}`;

  // Redirect to the new URL
  return NextResponse.redirect(newUrl, 307);
}
