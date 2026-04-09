import { NextRequest, NextResponse } from 'next/server';

const STREAM_TTL_MS = 1000 * 60 * 20;
const streamCache = new Map<string, { audioUrl: string; expiresAt: number }>();

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')?.trim();

  if (!id) {
    return NextResponse.json(
      { error: 'Query parameter "id" is required.' },
      { status: 400 },
    );
  }

  try {
    const now = Date.now();
    const cached = streamCache.get(id);

    if (cached && cached.expiresAt > now) {
      return NextResponse.json(cached);
    }

    const payload = {
      id,
      audioUrl: `/api/audio?id=${encodeURIComponent(id)}`,
      expiresAt: now + STREAM_TTL_MS,
    };

    streamCache.set(id, payload);

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to load audio stream.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
