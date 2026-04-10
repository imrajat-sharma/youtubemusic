import { NextRequest, NextResponse } from 'next/server';
import { getSubFeed } from '@/lib/backend/getSubFeed';

export async function GET(request: NextRequest) {
  const ids = request.nextUrl.searchParams
    .get('id')
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (!ids?.length) {
    return NextResponse.json(
      { error: 'Query parameter "id" is required.' },
      { status: 400 },
    );
  }

  try {
    const items = await getSubFeed(ids);
    return NextResponse.json(items);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Subfeed request failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
