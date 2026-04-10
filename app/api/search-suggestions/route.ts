import { NextRequest, NextResponse } from 'next/server';
import { getSearchSuggestions } from '@/lib/backend/getSearchSuggestions';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim();
  const music = request.nextUrl.searchParams.get('music') === 'true';

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required.' },
      { status: 400 },
    );
  }

  try {
    const suggestions = await getSearchSuggestions({ q: query, music });
    return NextResponse.json({ query, music, suggestions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Search suggestions request failed.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
