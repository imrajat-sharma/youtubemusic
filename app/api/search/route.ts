import { NextRequest, NextResponse } from 'next/server';
import { getSearch } from '@/lib/backend/getSearch';
import { toTrack } from '@/lib/backend/utils';
import type { YTItem } from '@/lib/types';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim();
  const filter = request.nextUrl.searchParams.get('f')?.trim() || 'song';

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required.' },
      { status: 400 },
    );
  }

  try {
    const items = await getSearch({ q: query, f: filter });
    const tracks = items
      .filter((item): item is YTItem => 'title' in item)
      .map(toTrack)
      .slice(0, 24);

    return NextResponse.json({ query, filter, items, tracks });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Search request failed.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
