import { YTNodes } from 'youtubei.js';
import type { YTChannelItem, YTItem } from '@/lib/types';
import { formatDuration, getClient, getThumbnail, getThumbnailId } from '@/lib/backend/utils';

export async function getChannel(id: string): Promise<YTChannelItem> {
  const yt = await getClient();
  const channel = await yt.getChannel(id);
  const metadata = channel.metadata;
  const videoTab = await channel.getVideos();

  const mapVideo = (item: any): YTItem | null => {
    if (!item.is(YTNodes.Video)) return null;

    const video = item.as(YTNodes.Video);
    const views = video.short_view_count?.toString() || video.view_count?.toString();
    const published = video.published?.toString()?.replace('Streamed ', '');

    return {
      id: video.id,
      title: video.title?.toString() || '',
      author: metadata.title?.toString() || '',
      authorId: id,
      duration: formatDuration(video.duration?.text?.toString()),
      subtext: `${views || ''}${published ? ` • ${published}` : ''}`,
      type: 'video',
    };
  };

  const items = videoTab.videos
    .map(mapVideo)
    .filter((item): item is YTItem => item !== null);

  return {
    id,
    name: metadata.title?.toString() || '',
    img: `/${getThumbnailId(getThumbnail(metadata.avatar || []))}`,
    items,
    type: 'channel',
  };
}
