import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import Ably from 'ably';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Authentication Check: Extract the access token from cookies
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { errorMessage: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    // 2. Identity Verification: Call the backend profile endpoint using the user's token
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    let user;
    try {
      const profileRes = await fetch(`${API_URL}/auth/profile/`, {
        method: 'GET',
        headers: {
          'Cookie': `access_token=${accessToken}`
        },
        cache: 'no-store'
      });

      if (!profileRes.ok) {
        return NextResponse.json(
          { errorMessage: 'Unauthorized: Session invalid or expired' },
          { status: 401 }
        );
      }
      user = await profileRes.json();
    } catch (fetchError) {
      console.error('Backend Auth Fetch Error:', fetchError);
      return NextResponse.json(
        { errorMessage: 'Authentication service currently unavailable' },
        { status: 503 }
      );
    }

    // 3. ClientID Validation: Ensure the requester matches the supplied clientId
    const verifiedUserId = user.id.toString().trim();
    const searchParams = request.nextUrl.searchParams;
    const requestedClientId = searchParams.get('clientId')?.trim();

    // If a clientId is provided, it MUST match the authenticated user's ID
    if (requestedClientId && requestedClientId !== verifiedUserId) {
      return NextResponse.json(
        { errorMessage: 'Forbidden: ClientID mismatch' },
        { status: 403 }
      );
    }

    // 4. Ably Token Generation
    if (!process.env.ABLY_API_KEY) {
      console.error('Environment Error: Missing ABLY_API_KEY');
      return NextResponse.json(
        { errorMessage: 'Internal Configuration Error' },
        { status: 500 }
      );
    }

    try {
      const client = new Ably.Rest(process.env.ABLY_API_KEY);
      // We only issue tokens for the verified user ID (no anonymous fallback)
      const tokenRequestData = await client.auth.createTokenRequest({
        clientId: verifiedUserId,
      });

      return NextResponse.json(tokenRequestData);
    } catch (ablyError: any) {
      console.error('Ably Token Request Error:', ablyError);
      return NextResponse.json(
        { errorMessage: 'Failed to issue Ably token Request: ' + (ablyError.message || 'Unknown error') },
        { status: 502 }
      );
    }
  } catch (err: any) {
    console.error('Fatal Ably Auth Logic Error:', err);
    return NextResponse.json(
      { errorMessage: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
