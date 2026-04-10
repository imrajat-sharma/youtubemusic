import { YTNodes } from 'youtubei.js';
import type { YTItem } from '@/lib/types';
import { formatDuration, getClient, parsePublished } from '@/lib/backend/utils';

export async function getSubFeed(ids: string[]): Promise<YTItem[]> {
  const yt = await getClient();

  const results = await Promise.all(
    ids.map((id) =>
      yt
        .getChannel(id)
        .then((channel) =>
          channel.getVideos().then((videos) => ({
            author: channel.metadata.title?.toString() || '',
            authorId: id,
            videos: videos.videos,
          })),
        )
        .catch(() => ({
          author: '',
          authorId: id,
          videos: [],
        })),
    ),
  );

  return results
    .flatMap((result) =>
      result.videos.flatMap((entry) => {
        if (!entry.is(YTNodes.Video)) return [];

        const video = entry.as(YTNodes.Video);
        const views = video.short_view_count?.toString() || video.view_count?.toString();
        if ((video.duration?.seconds || 0) <= 90 || !views) return [];

        return [
          {
            id: video.id,
            title: video.title?.toString() || '',
            author: result.author || video.author.name?.toString() || '',
            authorId: result.authorId || video.author.id || '',
            duration: formatDuration(video.duration?.text?.toString()),
            subtext: `${views}${video.published ? ` • ${video.published.toString().replace('Streamed ', '')}` : ''}`,
            type: 'video' as const,
            publishedAt: video.published?.toString() || '',
          },
        ];
      }),
    )
    .sort((a, b) => parsePublished(b.publishedAt) - parsePublished(a.publishedAt))
    .map(({ publishedAt, ...item }) => item);
}
