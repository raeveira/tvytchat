'use client'
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.substring(1); // Remove the leading '#'
    const hashParams = new URLSearchParams(hash);

    const access_token = hashParams.get('access_token');
    const token_type = hashParams.get('token_type');
    const scope = hashParams.get('scope');

    if (!access_token || !token_type) {
      throw new Error('Missing required parameters');
    }

    const newUrl = `http://localhost:3031/api/auth/twitch-redirect?access_token=${access_token}&token_type=${token_type}&scope=${scope}`;

    // Redirect to the new URL
    router.push(newUrl);
  }, [router]);

  return null; // Return null to prevent rendering anything
}
