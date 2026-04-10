import type { YTItem } from '@/lib/types';
import { getClient, streamMapper } from '@/lib/backend/utils';

type LastFmTrack = {
  name: string;
  artist: {
    name: string;
  };
};

type LastFmSimilarTracksResponse = {
  similartracks?: {
    track?: LastFmTrack[];
  };
  error?: number;
  message?: string;
};

export async function getSimilar(params: {
  title: string;
  artist: string;
  limit?: string;
}): Promise<Array<Omit<YTItem, 'subtext' | 'albumId' | 'img'>>> {
  const { title, artist, limit = '5' } = params;
  const apiKey = '0867bcb6f36c879398969db682a7b69b';
  const url = `https://ws.audioscrobbler.com/2.0/?method=track.getsimilar&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(title)}&api_key=${apiKey}&limit=${limit}&format=json`;

  const response = await fetch(url);
  const data = (await response.json()) as LastFmSimilarTracksResponse;

  if (data.error) {
    throw new Error(data.message || 'Failed to fetch similar tracks.');
  }

  const yt = await getClient();
  const results = await Promise.all(
    (data.similartracks?.track || []).map((track) =>
      yt.music
        .search(`${track.name} ${track.artist.name}`, { type: 'song' })
        .then((result) => {
          const song = result.songs?.contents?.[0];
          return song ? streamMapper(song) : null;
        })
        .catch(() => null),
    ),
  );

  return results
    .filter((item): item is YTItem => item !== null)
    .map(({ subtext, albumId, img, ...rest }) => rest);
}
