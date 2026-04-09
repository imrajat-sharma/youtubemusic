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
};
