import { NextRequest, NextResponse } from 'next/server';
import { getYoutubeClient } from '@/lib/youtube';
import type { Track } from '@/lib/types';

function enhanceThumbnail(url: string) {
  return url
    .replace(/=w\d+-h\d+/, '=w360-h360')
    .replace(/=s\d+/, '=w360-h360')
    .replace(/lh3\.googleusercontent\.com/, 'yt3.googleusercontent.com');
}

function normalizeTrack(item: {
  id?: string;
  title?: string;
  artists?: { name: string }[];
  author?: { name: string };
  album?: { name: string };
  duration?: { text: string; seconds: number };
  thumbnails?: { url: string }[];
}) {
  if (!item.id || !item.title || !item.duration) {
    return null;
  }

  const artist =
    item.artists?.map((entry) => entry.name).filter(Boolean).join(', ') ||
    item.author?.name ||
    'Unknown artist';

  const thumbnail = item.thumbnails?.[item.thumbnails.length - 1]?.url;

  if (!thumbnail) {
    return null;
  }

  const track: Track = {
    id: item.id,
    title: item.title,
    artist,
    album: item.album?.name,
    duration: item.duration.text,
    durationSeconds: item.duration.seconds,
    thumbnail: enhanceThumbnail(thumbnail),
  };

  return track;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim();

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required.' },
      { status: 400 },
    );
  }

  try {
    const youtube = await getYoutubeClient();
    const result = await youtube.music.search(query, { type: 'song' });
    const tracks = (result.songs?.contents ?? [])
      .map((item) =>
        normalizeTrack({
          id: item.id,
          title: item.title,
          artists: item.artists,
          author: item.author,
          album: item.album,
          duration: item.duration,
          thumbnails: item.thumbnails,
        }),
      )
      .filter((item): item is Track => Boolean(item))
      .slice(0, 12);

    return NextResponse.json({ query, tracks });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Search request failed.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
