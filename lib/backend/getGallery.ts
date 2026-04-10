import { YTNodes, type Helpers, type Innertube } from 'youtubei.js';
import type { YTListItem } from '@/lib/types';
import { getClient, getThumbnail, getThumbnailId } from '@/lib/backend/utils';

async function fetchFullArtistData(yt: Innertube, id: string) {
  try {
    const artist = await yt.music.getArtist(id);
    let title = '';
    let thumbnails: Array<{ url: string; width: number; height: number }> = [];

    const header = artist.header;
    if (header?.is(YTNodes.MusicImmersiveHeader)) {
      const immersiveHeader = header.as(YTNodes.MusicImmersiveHeader);
      title = immersiveHeader.title.text || '';
      thumbnails = immersiveHeader.thumbnail?.contents || [];
    } else if (header?.is(YTNodes.MusicVisualHeader)) {
      const visualHeader = header.as(YTNodes.MusicVisualHeader);
      title = visualHeader.title.text || '';
      thumbnails = visualHeader.thumbnail || [];
    }

    const findCarouselByTitle = (
      sections: Helpers.YTNode[] | undefined,
      targetTitle: string,
    ) =>
      sections?.find((section): section is YTNodes.MusicCarouselShelf => {
        if (!section.is(YTNodes.MusicCarouselShelf)) return false;
        const carouselHeader = section.header;
        return Boolean(
          carouselHeader?.is(YTNodes.MusicCarouselShelfBasicHeader) &&
          carouselHeader.title?.toString() === targetTitle,
        );
      });

    const playlistsSection = findCarouselByTitle(artist.sections, 'Featured on');
    const relatedSection = findCarouselByTitle(artist.sections, 'Fans might also like');

    const mapPlaylist = (item: any): YTListItem | null => {
      if (!item.is(YTNodes.MusicTwoRowItem)) return null;
      const musicItem = item.as(YTNodes.MusicTwoRowItem);
      return {
        id: musicItem.id || '',
        name: musicItem.title?.toString() || '',
        img: `/${getThumbnailId(getThumbnail(musicItem.thumbnail || []))}`,
        author: title,
        type: 'playlist',
      };
    };

    const mapArtist = (item: any): YTListItem | null => {
      if (!item.is(YTNodes.MusicTwoRowItem)) return null;
      const musicItem = item.as(YTNodes.MusicTwoRowItem);
      return {
        id: musicItem.id || '',
        name: musicItem.title?.toString() || '',
        img: `/${getThumbnailId(getThumbnail(musicItem.thumbnail || []))}`,
        type: 'artist',
      };
    };

    const featuredOnPlaylists = (playlistsSection?.contents || [])
      .map(mapPlaylist)
      .filter((item): item is YTListItem => item !== null);

    const recommendedArtists = (relatedSection?.contents || [])
      .map(mapArtist)
      .filter((item): item is YTListItem => item !== null);

    return {
      id,
      title,
      img: `/${getThumbnailId(getThumbnail(thumbnails))}`,
      featuredOnPlaylists,
      recommendedArtists,
    };
  } catch {
    return null;
  }
}

export async function getGallery(ids: string[]) {
  const yt = await getClient();
  const results = (
    await Promise.all(ids.map((id) => fetchFullArtistData(yt, id)))
  ).filter((item): item is NonNullable<typeof item> => item !== null);

  const recommendedArtistMap: Record<string, YTListItem & { count: number }> = {};
  const relatedPlaylistMap: Record<string, YTListItem & { count: number }> = {};

  for (const result of results) {
    result.recommendedArtists.forEach((artist) => {
      if (ids.includes(artist.id)) return;
      if (recommendedArtistMap[artist.id]) {
        recommendedArtistMap[artist.id].count += 1;
      } else {
        recommendedArtistMap[artist.id] = { ...artist, count: 1 };
      }
    });

    result.featuredOnPlaylists.forEach((playlist) => {
      if (relatedPlaylistMap[playlist.id]) {
        relatedPlaylistMap[playlist.id].count += 1;
      } else {
        relatedPlaylistMap[playlist.id] = { ...playlist, count: 1 };
      }
    });
  }

  return {
    userArtists: results.map((result) => ({
      id: result.id,
      name: result.title,
      img: result.img,
      type: 'artist' as const,
    })),
    relatedArtists: Object.values(recommendedArtistMap)
      .filter((item) => item.count > 1)
      .sort((a, b) => b.count - a.count)
      .map(({ count, ...artist }) => artist),
    relatedPlaylists: Object.values(relatedPlaylistMap)
      .filter((item) => item.count > 1)
      .sort((a, b) => b.count - a.count)
      .map(({ count, ...playlist }) => playlist),
  };
}
