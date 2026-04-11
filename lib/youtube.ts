import { Innertube, UniversalCache } from 'youtubei.js';
import { getClient } from '@/lib/backend/utils';

/**
 * For audio streaming, we try to create a client with retrieve_player: true
 * so it can decipher stream URLs. If that fails (network issues, etc.),
 * we fall back to the regular client.
 */
let audioClientPromise: Promise<Innertube> | null = null;

export function getAudioClient(): Promise<Innertube> {
  if (!audioClientPromise) {
    audioClientPromise = Innertube.create({
      cache: new UniversalCache(false),
      generate_session_locally: true,
      retrieve_player: true,
      fetch: globalThis.fetch.bind(globalThis),
    }).catch(() => {
      // If player retrieval fails, fall back to regular client
      console.warn('[youtube] Player retrieval failed, falling back to regular client');
      return getClient();
    });
  }
  return audioClientPromise;
}

/**
 * Re-export the main (fast) client for non-audio operations.
 */
export const getYoutubeClient = getClient;
