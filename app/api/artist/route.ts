import { NextRequest, NextResponse } from 'next/server';
import { getArtist } from '@/lib/backend/getArtist';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')?.trim();

  if (!id) {
    return NextResponse.json(
      { error: 'Query parameter "id" is required.' },
      { status: 400 },
    );
  }

  try {
    const artist = await getArtist(id);
    return NextResponse.json(artist);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Artist request failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
