import { NextRequest, NextResponse } from 'next/server';
import { getAudioClient } from '@/lib/youtube';

const STREAM_TTL_MS = 1000 * 60 * 20;
const AUDIO_FORMATS = [
  {
    client: 'IOS' as const,
    type: 'audio' as const,
    quality: 'best',
    format: 'mp4',
    codec: 'mp4a',
  },
  {
    client: 'ANDROID' as const,
    type: 'audio' as const,
    quality: 'best',
    format: 'mp4',
    codec: 'mp4a',
  },
  {
    client: 'ANDROID' as const,
    type: 'audio' as const,
    quality: 'best',
    format: 'any',
  },
];

const streamCache = new Map<
  string,
  { audioUrl: string; expiresAt: number; mimeType?: string; isFallback?: boolean }
>();

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

    const youtube = await getAudioClient();
    let payload:
      | { id: string; audioUrl: string; expiresAt: number; mimeType?: string; isFallback?: boolean }
      | null = null;

    for (const options of AUDIO_FORMATS) {
      try {
        const format = await youtube.getStreamingData(id, options);
        if (!format.url) {
          continue;
        }

        payload = {
          id,
          audioUrl: format.url,
          mimeType: format.mime_type?.split(';')[0],
          expiresAt: now + STREAM_TTL_MS,
        };
        break;
      } catch {
        // Try the next client/format combination.
      }
    }

    if (!payload) {
      payload = {
        id,
        audioUrl: `/api/audio?id=${encodeURIComponent(id)}`,
        expiresAt: now + STREAM_TTL_MS,
        isFallback: true,
      };
    }

    streamCache.set(id, payload);

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to load audio stream.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
