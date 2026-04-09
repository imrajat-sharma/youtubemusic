import { NextRequest, NextResponse } from 'next/server';
import { getYoutubeClient } from '@/lib/youtube';

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

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')?.trim();
  const incomingRange = request.headers.get('range') || 'bytes=0-';

  if (!id) {
    return NextResponse.json(
      { error: 'Query parameter "id" is required.' },
      { status: 400 },
    );
  }

  try {
    const youtube = await getYoutubeClient();
    let upstreamUrl = '';
    let lastError: unknown = null;

    const AUDIO_FORMATS = [
      { client: 'IOS' as const, type: 'audio' as const, quality: 'best', format: 'mp4', codec: 'mp4a' },
      { client: 'ANDROID' as const, type: 'audio' as const, quality: 'best', format: 'mp4', codec: 'mp4a' },
      { client: 'ANDROID' as const, type: 'audio' as const, quality: 'best', format: 'any' },
    ];

    for (const options of AUDIO_FORMATS) {
      try {
        const format = await youtube.getStreamingData(id, options);
        if (format.url) {
          upstreamUrl = format.url;
          break;
        }
      } catch (error) {
        lastError = error;
      }
    }

    if (!upstreamUrl) {
      console.error("Audio upstream failure. lastError:", lastError);
      throw (
        lastError instanceof Error
          ? lastError
          : new Error(`Unable to resolve a playable audio stream.`)
      );
    }

    const remoteResponse = await fetch(upstreamUrl, {
      cache: 'no-store', // Crucial to prevent Next.js from caching a 403
      headers: {
        'Accept': '*/*',
        'Range': incomingRange,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
    });

    if (!remoteResponse.ok || !remoteResponse.body) {
      throw new Error(`Upstream audio request failed with status ${remoteResponse.status}.`);
    }

    const headers = new Headers();
    headers.set('Content-Type', remoteResponse.headers.get('content-type') || 'audio/mp4');
    headers.set('Cache-Control', 'public, max-age=1200');

    const contentLength = remoteResponse.headers.get('content-length');
    const acceptRanges = remoteResponse.headers.get('accept-ranges');
    const contentRange = remoteResponse.headers.get('content-range');

    if (contentLength) headers.set('Content-Length', contentLength);
    if (acceptRanges) headers.set('Accept-Ranges', acceptRanges);
    if (contentRange) headers.set('Content-Range', contentRange);

    return new NextResponse(remoteResponse.body, {
      status: remoteResponse.status,
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to stream audio.';
    return NextResponse.json({ error: message, details: String(error) }, { status: 500 });
  }
}
