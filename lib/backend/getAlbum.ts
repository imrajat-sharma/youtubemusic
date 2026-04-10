import { YTNodes } from 'youtubei.js';
import type { YTAlbumItem, YTItem } from '@/lib/types';
import { formatDuration, getClient, getThumbnail, getThumbnailId } from '@/lib/backend/utils';

export async function getAlbum(id: string): Promise<YTAlbumItem> {
  const yt = await getClient();
  const album = await yt.music.getAlbum(id);

  let name = '';
  let author = '';
  let thumbnails: Array<{ url: string; width: number; height: number }> = [];
  let year = '';
  let playlistId = '';
  let authorId = '';

  const header = album.header;

  if (header?.is(YTNodes.MusicDetailHeader)) {
    const detailHeader = header.as(YTNodes.MusicDetailHeader);
    name = detailHeader.title.text || '';
    author = detailHeader.author?.name || '';
    authorId = detailHeader.author?.channel_id || '';
    thumbnails = detailHeader.thumbnails;
    year = detailHeader.year || '';

    const subtitleRuns = detailHeader.subtitle?.runs || [];
    if (!author || !authorId) {
      const artistRun = subtitleRuns.find(
        (run) =>
          ('endpoint' in run && (run as any).endpoint?.payload?.browseId?.startsWith('UC')) ||
          ('endpoint' in run && (run as any).endpoint?.browseId?.startsWith('UC')),
      ) as any;

      if (artistRun) {
        author = author || artistRun.text || '';
        authorId = authorId || artistRun.endpoint?.payload?.browseId || artistRun.endpoint?.browseId;
      }
    }

    if (!year) {
      year = subtitleRuns.find((run) => /^\d{4}$/.test(run.text || ''))?.text || '';
    }
  } else if (header?.is(YTNodes.MusicResponsiveHeader)) {
    const responsiveHeader = header.as(YTNodes.MusicResponsiveHeader);
    name = responsiveHeader.title.text || '';
    thumbnails = (responsiveHeader as any).thumbnail?.contents || [];

    const strapline = (responsiveHeader as any).strapline_text_one;
    if (strapline) {
      author = strapline.text || '';
      const run = strapline.runs?.[0];
      if (run?.endpoint) {
        authorId = run.endpoint.payload?.browseId || run.endpoint.browseId;
      }
    }

    const subtitleRuns = responsiveHeader.subtitle?.runs || [];
    if (!year) {
      year = subtitleRuns.find((run) => /^\d{4}$/.test(run.text || ''))?.text || '';
    }
  }

  const playButton = (header as any)?.buttons?.find((button: any) => button.type === 'MusicPlayButton');
  if (playButton) {
    playlistId = playButton.endpoint?.payload?.playlistId;
  }

  if (!playlistId) {
    const menu = (header as any)?.menu || (header as any)?.buttons?.find((button: any) => button.type === 'Menu');
    const shuffleItem = menu?.items?.find(
      (item: any) => item.endpoint?.payload?.playlistId && item.icon_type === 'MUSIC_SHUFFLE',
    );
    if (shuffleItem) {
      playlistId = shuffleItem.endpoint.payload.playlistId;
    }
  }

  let items: YTItem[] = [];
  const mapMusicItem = (item: unknown): YTItem | null => {
    if (!(item instanceof YTNodes.MusicResponsiveListItem) && !(item as any)?.is?.(YTNodes.MusicResponsiveListItem)) {
      return null;
    }

    const musicItem = (item as any).as
      ? (item as any).as(YTNodes.MusicResponsiveListItem)
      : (item as YTNodes.MusicResponsiveListItem);
    const videoId = musicItem.id || (musicItem as any).videoId;
    if (!videoId) return null;

    return {
      id: videoId,
      title: musicItem.title || '',
      author:
        musicItem.author?.name ||
        (musicItem as any).authors?.[0]?.name ||
        musicItem.artists?.[0]?.name ||
        author ||
        '',
      authorId:
        musicItem.author?.channel_id ||
        (musicItem as any).authors?.[0]?.channel_id ||
        musicItem.artists?.[0]?.channel_id ||
        authorId ||
        '',
      duration: formatDuration(musicItem.duration?.text),
      albumId: id,
      type: 'song',
      subtext: name,
    };
  };

  if (playlistId) {
    try {
      const playlist = await yt.music.getPlaylist(playlistId);
      items = (playlist.contents || [])
        .map(mapMusicItem)
        .filter((item): item is YTItem => item !== null);
    } catch {
      items = [];
    }
  }

  if (items.length === 0) {
    items = (album.contents || [])
      .map(mapMusicItem)
      .filter((item): item is YTItem => item !== null);
  }

  return {
    id,
    name,
    author,
    year,
    img: `/${getThumbnailId(getThumbnail(thumbnails))}`,
    items,
    type: 'album',
  };
}
