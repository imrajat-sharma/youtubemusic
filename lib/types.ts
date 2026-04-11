export type Track = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: string;
  durationSeconds: number;
  thumbnail: string;
};

export type SearchResponse = {
  query: string;
  tracks: Track[];
};

export type StreamResponse = {
  id: string;
  audioUrl: string;
  expiresAt: number;
  mimeType?: string;
  isFallback?: boolean;
};

export type YTItemType = 'song' | 'video';

export type YTItem = {
  id: string;
  title: string;
  author: string;
  authorId: string;
  duration: string;
  subtext?: string;
  type: YTItemType;
  albumId?: string;
  img?: string;
};

export type YTListItemType =
  | 'playlist'
  | 'channel'
  | 'artist'
  | 'album';

export type YTListItem = {
  id: string;
  name: string;
  type: YTListItemType;
  img?: string;
  author?: string;
  year?: string;
  subscribers?: string;
  description?: string;
  videoCount?: string;
  playlistId?: string;
};

export type YTPlaylistItem = {
  id: string;
  name: string;
  author: string;
  img: string;
  type: 'playlist';
  items: YTItem[];
  hasContinuation: boolean;
};

export type YTAlbumItem = {
  id: string;
  name: string;
  author: string;
  year: string;
  img: string;
  items: YTItem[];
  type: 'album';
};

export type YTArtistItem = {
  id: string;
  name: string;
  img: string;
  items: YTItem[];
  albums: YTListItem[];
  type: 'artist';
};

export type YTChannelItem = {
  id: string;
  name: string;
  img: string;
  items: YTItem[];
  type: 'channel';
};
