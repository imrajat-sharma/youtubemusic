import { NextRequest, NextResponse } from 'next/server';
import { getGallery } from '@/lib/backend/getGallery';

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
    const gallery = await getGallery(ids);
    return NextResponse.json(gallery);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gallery request failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
