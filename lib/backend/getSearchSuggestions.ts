import { YTNodes } from 'youtubei.js';
import { getClient } from '@/lib/backend/utils';

export async function getSearchSuggestions(params: { q: string; music?: boolean }) {
  const { q, music } = params;
  const yt = await getClient();

  if (music) {
    const suggestions = await yt.music.getSearchSuggestions(q);
    return (
      suggestions
        .first()
        ?.contents.map((item) => item.as(YTNodes.SearchSuggestion).suggestion.toString()) || []
    );
  }

  return yt.getSearchSuggestions(q);
}
