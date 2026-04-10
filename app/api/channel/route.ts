import { NextRequest, NextResponse } from 'next/server';
import { getChannel } from '@/lib/backend/getChannel';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')?.trim();

  if (!id) {
    return NextResponse.json(
      { error: 'Query parameter "id" is required.' },
      { status: 400 },
    );
  }

  try {
    const channel = await getChannel(id);
    return NextResponse.json(channel);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Channel request failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
