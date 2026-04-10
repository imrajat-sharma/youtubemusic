import { NextRequest, NextResponse } from 'next/server';
import { getPlaylist } from '@/lib/backend/getPlaylist';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')?.trim();
  const all = request.nextUrl.searchParams.get('all') === 'true';

  if (!id) {
    return NextResponse.json(
      { error: 'Query parameter "id" is required.' },
      { status: 400 },
    );
  }

  try {
    const playlist = await getPlaylist(id, all);
    return NextResponse.json(playlist);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Playlist request failed.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
