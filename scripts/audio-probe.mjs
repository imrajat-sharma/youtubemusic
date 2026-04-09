import { Innertube } from 'youtubei.js';

const videoId = process.argv[2] ?? 'h6TzXFARexQ';

async function main() {
  const yt = await Innertube.create();
  const format = await yt.getStreamingData(videoId, {
    type: 'audio',
    client: 'ANDROID',
  });

  if (!format?.url) {
    throw new Error(`No audio stream URL was returned for video "${videoId}".`);
  }

  const response = await fetch(format.url, {
    headers: {
      Range: 'bytes=0-100',
    },
  });

  console.log(`VIDEO: ${videoId}`);
  console.log(`STATUS: ${response.status}`);
  console.log(`CONTENT-TYPE: ${response.headers.get('content-type') ?? 'unknown'}`);
  console.log(`CONTENT-RANGE: ${response.headers.get('content-range') ?? 'none'}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
