import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');
export const DATA_DIR = path.join(ROOT, 'data');

export const paths = {
  rawFeed:      path.join(DATA_DIR, 'raw-feed.xml'),
  rawEpisodes:  path.join(DATA_DIR, 'raw-episodes.json'),
  parsed:       path.join(DATA_DIR, 'parsed-songs.json'),
  parseReport:  path.join(DATA_DIR, 'parse-report.md'),
  songIds:      path.join(DATA_DIR, 'song-ids.json'),
  overrides:    path.join(DATA_DIR, 'overrides.json'),
  spotifyCache: path.join(DATA_DIR, 'spotify-cache.json'),
  youtubeCache: path.join(DATA_DIR, 'youtube-cache.json'),
  episodes:     path.join(DATA_DIR, 'episodes.json'),
};
