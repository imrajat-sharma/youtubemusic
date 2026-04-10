import { YTNodes } from 'youtubei.js';
import type { YTArtistItem, YTItem, YTListItem } from '@/lib/types';
import { formatDuration, getClient, getThumbnail, getThumbnailId } from '@/lib/backend/utils';

export async function getArtist(id: string): Promise<YTArtistItem> {
  const yt = await getClient();
  const artist = await yt.music.getArtist(id);

  let name = '';
  let thumbnails: Array<{ url: string; width: number; height: number }> = [];

  const header = artist.header;
  if (header?.is(YTNodes.MusicImmersiveHeader)) {
    const immersiveHeader = header.as(YTNodes.MusicImmersiveHeader);
    name = immersiveHeader.title.text || '';
    thumbnails = immersiveHeader.thumbnail?.contents || [];
  } else if (header?.is(YTNodes.MusicVisualHeader)) {
    const visualHeader = header.as(YTNodes.MusicVisualHeader);
    name = visualHeader.title.text || '';
    thumbnails = visualHeader.thumbnail || [];
  }

  let songItems = [] as any[];
  try {
    const songs = await artist.getAllSongs();
    songItems = songs?.contents || [];
  } catch {
    const songsSection = artist.sections
      ?.find(
        (section) =>
          section.is(YTNodes.MusicShelf) &&
          section.as(YTNodes.MusicShelf).title?.text?.toLowerCase().includes('songs'),
      )
      ?.as(YTNodes.MusicShelf);
    songItems = songsSection?.contents || [];
  }

  const mapSong = (item: any): YTItem | null => {
      if (!item.is(YTNodes.MusicResponsiveListItem)) return null;

      const musicItem = item.as(YTNodes.MusicResponsiveListItem);
      const album = musicItem.album?.name;
      const views = musicItem.views?.toString();
      const subtext = `${album || ''}${views ? `${album ? ' • ' : ''}${views}` : ''}`;

      let duration = musicItem.duration?.text;
      if (!duration && musicItem.subtitle) {
        duration = musicItem.subtitle.runs?.find((run: any) => /^(\d+:)?\d+:\d+$/.test(run.text))?.text;
      }
      if (!duration && musicItem.fixed_columns) {
        const fixedColumn = musicItem.fixed_columns.find((column: any) =>
          column.is(YTNodes.MusicResponsiveListItemFixedColumn),
        );
        if (fixedColumn) {
          duration = fixedColumn.as(YTNodes.MusicResponsiveListItemFixedColumn).title.toString();
        }
      }

      return {
        id: musicItem.id || '',
        title: musicItem.title || '',
        author: musicItem.author?.name || musicItem.artists?.[0]?.name || name,
        authorId: musicItem.author?.channel_id || musicItem.artists?.[0]?.channel_id || id,
        duration: formatDuration(duration),
        albumId: musicItem.album?.id || '',
        type: 'song' as const,
        subtext,
      };
    };

  const items: YTItem[] = songItems
    .map(mapSong)
    .filter((item): item is YTItem => item !== null);

  const albumsSection = artist.sections
    ?.find(
      (section) =>
        section.is(YTNodes.MusicCarouselShelf) &&
        section.as(YTNodes.MusicCarouselShelf).header?.is(YTNodes.MusicCarouselShelfBasicHeader) &&
        section.as(YTNodes.MusicCarouselShelf).header?.as(YTNodes.MusicCarouselShelfBasicHeader).title?.text ===
          'Albums',
    )
    ?.as(YTNodes.MusicCarouselShelf);

  const singlesSection = artist.sections
    ?.find(
      (section) =>
        section.is(YTNodes.MusicCarouselShelf) &&
        section.as(YTNodes.MusicCarouselShelf).header?.is(YTNodes.MusicCarouselShelfBasicHeader) &&
        section
          .as(YTNodes.MusicCarouselShelf)
          .header?.as(YTNodes.MusicCarouselShelfBasicHeader)
          .title?.text?.includes('Singles'),
    )
    ?.as(YTNodes.MusicCarouselShelf);

  const mapAlbum = (item: any): YTListItem | null => {
    if (!item.is(YTNodes.MusicTwoRowItem)) return null;

    const musicItem = item.as(YTNodes.MusicTwoRowItem);
    const isEP = musicItem.subtitle?.toString()?.toLowerCase().includes('ep');
    if (singlesSection?.contents?.includes(item) && !isEP) return null;

    return {
      id: musicItem.id || '',
      name: musicItem.title.toString() || '',
      img: `/${getThumbnailId(getThumbnail(musicItem.thumbnail || []))}`,
      year: musicItem.year || '',
      type: 'album',
      author: name,
    };
  };

  const albums = [
    ...(albumsSection?.contents || []).map(mapAlbum).filter((item): item is YTListItem => item !== null),
    ...(singlesSection?.contents || []).map(mapAlbum).filter((item): item is YTListItem => item !== null),
  ];

  return {
    id,
    name,
    img: `/${getThumbnailId(getThumbnail(thumbnails))}`,
    items,
    albums,
    type: 'artist',
  };
}
