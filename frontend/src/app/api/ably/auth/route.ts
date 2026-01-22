import { NextRequest, NextResponse } from 'next/server';
import Ably from 'ably';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const clientId = searchParams.get('clientId');

  if (!process.env.ABLY_API_KEY) {
    return NextResponse.json(
      { errorMessage: 'Missing ABLY_API_KEY environment variable.' },
      { status: 500 }
    );
  }

  const client = new Ably.Rest(process.env.ABLY_API_KEY);
  const tokenRequestData = await client.auth.createTokenRequest({
    clientId: clientId || 'anonymous',
  });
  
  return NextResponse.json(tokenRequestData);
}
