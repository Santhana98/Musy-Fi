import { resolveYoutubeMetadata } from './src/lib/youtubeResolver';

async function main() {
  const meta = await resolveYoutubeMetadata('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  console.log(meta);
}
main().catch(console.error);
