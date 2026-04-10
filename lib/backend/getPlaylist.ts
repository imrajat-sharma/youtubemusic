import { YTNodes, type Helpers } from 'youtubei.js';
import type { YTItem, YTPlaylistItem } from '@/lib/types';
import { formatDuration, getClient, getThumbnail, getThumbnailId } from '@/lib/backend/utils';

export async function getPlaylist(id: string, all?: boolean): Promise<YTPlaylistItem> {
  const yt = await getClient();
  let playlist = await yt.getPlaylist(id);

  const { info } = playlist;
  const name = info.title || 'Unknown Playlist';
  const author = info.author.name || 'Unknown';
  const img = `/${getThumbnailId(getThumbnail(info.thumbnails || []))}`;

  const items: YTItem[] = [];

  const mapItems = (entries: Helpers.YTNode[]) => {
    entries.forEach((item) => {
      if (!item.is(YTNodes.PlaylistVideo)) return;

      const video = item.as(YTNodes.PlaylistVideo);
      items.push({
        id: video.id,
        title: video.title.toString(),
        author: video.author.name,
        authorId: video.author.id,
        duration: formatDuration(video.duration.text),
        subtext: video.video_info?.toString() || '',
        type: 'video',
      });
    });
  };

  mapItems(playlist.items);

  if (all) {
    while (playlist.has_continuation) {
      playlist = await playlist.getContinuation();
      mapItems(playlist.items);
    }
  }

  return {
    id,
    name,
    author,
    img,
    type: 'playlist',
    items,
    hasContinuation: playlist.has_continuation,
  };
}
