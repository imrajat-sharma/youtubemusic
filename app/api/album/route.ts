import { NextRequest, NextResponse } from 'next/server';
import { getAlbum } from '@/lib/backend/getAlbum';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')?.trim();

  if (!id) {
    return NextResponse.json(
      { error: 'Query parameter "id" is required.' },
      { status: 400 },
    );
  }

  try {
    const album = await getAlbum(id);
    return NextResponse.json(album);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Album request failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
