import { Innertube, UniversalCache, YTNodes, type Helpers } from 'youtubei.js';
import type { YTItem, YTListItem } from '@/lib/types';

let youtubePromise: Promise<Innertube> | null = null;

export function getClient(): Promise<Innertube> {
  if (!youtubePromise) {
    youtubePromise = Innertube.create({
      cache: new UniversalCache(false),
      generate_session_locally: true,
      retrieve_player: false,
      fetch: globalThis.fetch.bind(globalThis),
    });
  }

  return youtubePromise;
}

export function getThumbnailId(url?: string): string {
  if (!url) return '';

  const fullUrl = url.startsWith('//') ? `https:${url}` : url;

  if (fullUrl.includes('/vi/')) {
    return fullUrl.split('/vi/')[1]?.split('/')[0] || '';
  }

  try {
    const urlObj = new URL(fullUrl);
    const segments = urlObj.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1] || '';
    const secondLast = segments[segments.length - 2] || '';
    const id = last.split('=')[0];

    if (secondLast.startsWith('a-') || secondLast === '-a') {
      return `${secondLast}/${id}`;
    }

    if (secondLast === 'picture' && segments.includes('profile')) {
      return id;
    }

    return id;
  } catch {
    return fullUrl.split('/').pop()?.split('=')[0] || '';
  }
}

export function getThumbnail(
  thumbnails?: Array<{ url: string; width?: number }>,
): string {
  if (!thumbnails?.length) return '';
  return [...thumbnails].sort((a, b) => (b.width || 0) - (a.width || 0))[0]?.url || '';
}

export function formatDuration(durationText?: string): string {
  if (durationText?.length === 4) {
    return `0${durationText}`;
  }

  return durationText || '00:00';
}

export function parsePublished(text: string): number {
  if (!text) return 0;

  const now = Date.now();
  const match = text.match(
    /(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/,
  );

  if (!match) return 0;

  const value = Number.parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    second: 1000,
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
  };

  return now - value * multipliers[unit];
}

export function toTrack(item: YTItem) {
  const durationParts = item.duration.split(':').map(Number);
  const durationSeconds = durationParts.reduce((total, part) => total * 60 + part, 0);

  return {
    id: item.id,
    title: item.title,
    artist: item.author.replace(/\s+-\s+Topic$/, ''),
    album: item.subtext?.split(' • ')[0] || undefined,
    duration: item.duration,
    durationSeconds,
    thumbnail: item.img?.startsWith('/') ? `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg` : item.img || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
  };
}

export function streamMapper(node: Helpers.YTNode): YTItem | null {
  if (node.is(YTNodes.Video)) {
    const video = node.as(YTNodes.Video);

    if ((video.duration?.seconds || 0) < 90) return null;

    const views = video.short_view_count?.toString() || video.view_count?.toString();
    const published = video.published?.toString()?.replace('Streamed ', '');
    const subtext = `${views || ''}${published ? ` • ${published}` : ''}`;

    return {
      id: video.id,
      title: video.title?.toString() || 'Unknown',
      author: video.author?.name || 'Unknown',
      authorId: video.author?.id || '',
      duration: formatDuration(video.duration?.text?.toString()),
      subtext,
      type: 'video',
    };
  }

  if (node.is(YTNodes.MusicResponsiveListItem)) {
    const song = node.as(YTNodes.MusicResponsiveListItem);
    const album = song.album?.name;
    const views = song.views?.toString();
    const subtext = `${album || ''}${views ? `${album ? ' • ' : ''}${views}` : ''}`;

    const playlistId =
      song.menu?.items
        ?.find(
          (item: any) =>
            item.is(YTNodes.MenuNavigationItem) &&
            item.as(YTNodes.MenuNavigationItem).endpoint?.payload?.playlistId?.startsWith('OLAK'),
        )
        ?.as(YTNodes.MenuNavigationItem)
        .endpoint?.payload?.playlistId ||
      song.album?.id ||
      '';

    return {
      id: song.id || '',
      title: song.title?.toString() || 'Unknown',
      author: song.artists?.[0]?.name ? `${song.artists[0].name} - Topic` : 'Unknown',
      authorId: song.artists?.[0]?.channel_id || '',
      albumId: playlistId,
      duration: formatDuration(song.duration?.text),
      img: `/${getThumbnailId(song.thumbnail?.contents?.[0]?.url)}`,
      subtext,
      type: 'song',
    };
  }

  return null;
}

export function listMapper(node: Helpers.YTNode): YTListItem | null {
  if (node.is(YTNodes.Playlist)) {
    const playlist = node.as(YTNodes.Playlist);

    if (playlist.id?.startsWith('RD')) return null;

    return {
      id: playlist.id,
      name: playlist.title?.toString() || 'Unknown',
      videoCount: playlist.video_count?.toString() || '0 videos',
      img: `/${getThumbnailId(playlist.thumbnails?.[0]?.url)}`,
      type: 'playlist',
    };
  }

  if (node.is(YTNodes.Channel)) {
    const channel = node.as(YTNodes.Channel);
    const description =
      channel.description_snippet?.text ||
      channel.description_snippet?.runs?.map((run) => run.text).join('') ||
      '';

    let subscribers = channel.subscriber_count?.toString() || '';
    let videoCount = channel.video_count?.toString() || '';

    if (videoCount.includes('subscribers') && (subscribers.startsWith('@') || !subscribers)) {
      subscribers = videoCount;
      videoCount = '';
    }

    return {
      id: channel.id,
      name: channel.author?.name || 'Unknown',
      subscribers: subscribers || '0 subscribers',
      img: `/${getThumbnailId(channel.author?.thumbnails?.[0]?.url)}`,
      description,
      videoCount,
      type: 'channel',
    };
  }

  if (node.is(YTNodes.MusicResponsiveListItem)) {
    const item = node.as(YTNodes.MusicResponsiveListItem);
    const type = item.item_type?.toLowerCase();

    if (type === 'artist') {
      const subscribers =
        item.subscribers ||
        item.subtitle?.runs?.find((run: any) => run.text?.includes('subscribers'))?.text ||
        '';

      return {
        id: item.id || '',
        name: item.name || 'Unknown',
        subscribers,
        img: `/${getThumbnailId(item.thumbnail?.contents?.[0]?.url)}`,
        type: 'artist',
      };
    }

    if (type === 'album') {
      const playlistId =
        ((item.overlay?.content?.is(YTNodes.MusicItemThumbnailOverlay)
          ? (item.overlay.content as any).endpoint?.payload?.playlistId
          : undefined) as string | undefined) ||
        item.menu?.items
          ?.find(
            (entry: any) =>
              entry.is(YTNodes.MenuNavigationItem) &&
              entry.as(YTNodes.MenuNavigationItem).endpoint?.payload?.playlistId,
          )
          ?.as(YTNodes.MenuNavigationItem)
          .endpoint?.payload?.playlistId ||
        '';

      const artistName =
        item.author?.name ||
        item.artists?.[0]?.name ||
        item.subtitle?.runs?.find((run: any) => run.endpoint?.payload?.browseId?.startsWith('UC'))?.text ||
        'Unknown Artist';

      return {
        id: item.id || '',
        name: item.title || item.name || 'Unknown',
        playlistId,
        author: artistName,
        year:
          item.year ||
          item.subtitle?.runs?.find((run: any) => /^\d{4}$/.test(run.text || ''))?.text ||
          '',
        img: `/${getThumbnailId(item.thumbnail?.contents?.[0]?.url)}`,
        type: 'album',
      };
    }
  }

  return null;
}
