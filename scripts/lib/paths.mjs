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
  criticScores: path.join(DATA_DIR, 'critic-scores.json'),
  spotifyCache: path.join(DATA_DIR, 'spotify-cache.json'),
  spotifyEpisodes: path.join(DATA_DIR, 'spotify-episodes.json'),
  youtubeCache: path.join(DATA_DIR, 'youtube-cache.json'),
  episodes:     path.join(DATA_DIR, 'episodes.json'),
  reviewList:   path.join(DATA_DIR, 'review-list.md'),
  reviewPage:   path.join(DATA_DIR, 'review-list.html'),
  // Sama fail frontendile serveerimiseks. Genereeritud, seepärast .gitignore's.
  webEpisodes:  path.join(ROOT, 'web', 'public', 'episodes.json'),
};
