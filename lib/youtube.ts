import Innertube from 'youtubei.js';

let youtubePromise: Promise<Innertube> | null = null;

export function getYoutubeClient() {
  if (!youtubePromise) {
    
    youtubePromise = Innertube.create();
  }

  return youtubePromise;
}
