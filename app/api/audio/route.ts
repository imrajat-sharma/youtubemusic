import { NextRequest, NextResponse } from 'next/server';
import { getAudioClient } from '@/lib/youtube';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const AUDIO_PREFERENCES = [
  {
    type: 'audio' as const,
    quality: 'best' as const,
    format: 'mp4',
    codec: 'mp4a',
  },
  {
    type: 'audio' as const,
    quality: 'best' as const,
    format: 'any',
  },
];

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')?.trim();
  const incomingRange = request.headers.get('range');

  if (!id) {
    return NextResponse.json(
      { error: 'Query parameter "id" is required.' },
      { status: 400 },
    );
  }

  try {
    const youtube = await getAudioClient();

    const info = await youtube.getBasicInfo(id, { client: 'ANDROID' });
    let format: any = null;

    for (const preference of AUDIO_PREFERENCES) {
      try {
        format = info.chooseFormat(preference);
        if (format) break;
      } catch {
        continue;
      }
    }

    if (!format) {
      throw new Error('Unable to choose a playable audio format.');
    }

    const mimeType = format.mime_type?.split(';')[0] || 'audio/mp4';
    const totalLength = format.content_length ? Number(format.content_length) : undefined;

    // Parse range header
    let rangeStart: number | undefined;
    let rangeEnd: number | undefined;

    if (incomingRange?.startsWith('bytes=')) {
      const [startText, endText] = incomingRange.replace('bytes=', '').split('-');
      rangeStart = Number.parseInt(startText, 10);
      if (Number.isNaN(rangeStart)) rangeStart = undefined;
      rangeEnd = endText ? Number.parseInt(endText, 10) : undefined;
      if (rangeEnd !== undefined && Number.isNaN(rangeEnd)) rangeEnd = undefined;
    }

    // Try multiple download strategies
    const clients = ['ANDROID' as const, 'IOS' as const];
    let lastError: unknown = null;

    for (const client of clients) {
      for (const preference of AUDIO_PREFERENCES) {
        try {
          const downloadParams: any = {
            client,
            ...preference,
          };

          if (rangeStart !== undefined) {
            downloadParams.range = {
              start: rangeStart,
              end: rangeEnd ?? (totalLength ? totalLength - 1 : rangeStart + 1024 * 1024 - 1),
            };
          }

          const body = await youtube.download(id, downloadParams);

          const headers = new Headers();
          headers.set('Content-Type', mimeType);
          headers.set('Cache-Control', 'public, max-age=600');
          headers.set('Accept-Ranges', 'bytes');

          if (totalLength && rangeStart !== undefined) {
            const end = Math.min(
              rangeEnd ?? totalLength - 1,
              totalLength - 1,
            );
            const length = end - rangeStart + 1;
            headers.set('Content-Length', String(length));
            headers.set('Content-Range', `bytes ${rangeStart}-${end}/${totalLength}`);
            return new NextResponse(body, { status: 206, headers });
          }

          if (totalLength) {
            headers.set('Content-Length', String(totalLength));
          }

          return new NextResponse(body, { status: 200, headers });
        } catch (err) {
          lastError = err;
          continue;
        }
      }
    }

    // Fallback: Try streaming URL directly with proper headers
    const streamingData = info.streaming_data;
    const adaptiveFormats = streamingData?.adaptive_formats || [];
    const audioFormats = adaptiveFormats
      .filter((f: any) => f.mime_type?.startsWith('audio/'))
      .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

    for (const fmt of audioFormats) {
      const url = fmt.url;
      if (!url) continue;

      try {
        const remoteResponse = await fetch(url, {
          cache: 'no-store',
          redirect: 'follow',
          headers: {
            Accept: '*/*',
            ...(incomingRange ? { Range: incomingRange } : {}),
            'User-Agent': 'com.google.android.youtube/19.29.37 (Linux; U; Android 14) gzip',
          },
        });

        if (!remoteResponse.ok || !remoteResponse.body) continue;

        const headers = new Headers();
        headers.set(
          'Content-Type',
          remoteResponse.headers.get('content-type') || mimeType,
        );
        headers.set('Cache-Control', 'public, max-age=600');

        const cl = remoteResponse.headers.get('content-length');
        const ar = remoteResponse.headers.get('accept-ranges');
        const cr = remoteResponse.headers.get('content-range');
        if (cl) headers.set('Content-Length', cl);
        if (ar) headers.set('Accept-Ranges', ar);
        if (cr) headers.set('Content-Range', cr);

        return new NextResponse(remoteResponse.body, {
          status: remoteResponse.status,
          headers,
        });
      } catch {
        continue;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('Unable to resolve a playable audio stream.');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to stream audio.';
    console.error('[audio route]', id, message);
    return NextResponse.json(
      { error: message, details: String(error) },
      { status: 500 },
    );
  }
}
