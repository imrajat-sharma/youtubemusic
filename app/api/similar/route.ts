import { NextRequest, NextResponse } from 'next/server';
import { getSimilar } from '@/lib/backend/getSimilar';

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get('title')?.trim();
  const artist = request.nextUrl.searchParams.get('artist')?.trim();
  const limit = request.nextUrl.searchParams.get('limit')?.trim() || undefined;

  if (!title || !artist) {
    return NextResponse.json(
      { error: 'Query parameters "title" and "artist" are required.' },
      { status: 400 },
    );
  }

  try {
    const items = await getSimilar({ title, artist, limit });
    return NextResponse.json(items);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Similar request failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
