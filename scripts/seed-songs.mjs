// Genereerib data/seed-songs.sql, mis viib lood data/episodes.json-ist D1-i.
//
// Lood on andmebaasis selleks, et hindeid saaks vastu võtta ainult päris lugudele —
// ilma selleta võiks keegi POST'ida suvalise songId ja täita tabeli prügiga.
//
// Skript on korduvkäivitatav: INSERT ... ON CONFLICT uuendab olemasolevat rida,
// nii et uue saate lisandudes piisab sama faili uuesti käivitamisest.

import fs from 'node:fs/promises';
import path from 'node:path';
import { paths, DATA_DIR } from './lib/paths.mjs';

const OUT = path.join(DATA_DIR, 'seed-songs.sql');

const sqlString = (s) => `'${String(s).replace(/'/g, "''")}'`;

async function main() {
  const data = JSON.parse(await fs.readFile(paths.episodes, 'utf8'));

  const rows = data.episodes.flatMap((ep) =>
    ep.songs.map((song) => `(${[
      sqlString(song.id),
      sqlString(ep.guid),
      sqlString(song.artistsRaw),
      sqlString(song.title),
      sqlString(ep.publishedAt),
    ].join(', ')})`));

  if (rows.length === 0) throw new Error('episodes.json ei sisalda ühtegi lugu.');

  // Suured INSERT-id tükkideks — D1 piirab ühe lause suurust.
  const CHUNK = 100;
  const statements = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    statements.push(
      'INSERT INTO songs (id, episode_guid, artists, title, published_at) VALUES\n'
      + rows.slice(i, i + CHUNK).join(',\n')
      + '\nON CONFLICT(id) DO UPDATE SET'
      + ' episode_guid = excluded.episode_guid,'
      + ' artists = excluded.artists,'
      + ' title = excluded.title,'
      + ' published_at = excluded.published_at;',
    );
  }

  const sql = [
    '-- GENEREERITUD failist data/episodes.json — ära muuda käsitsi.',
    `-- Lugusid: ${rows.length}. Uuenda käsuga: npm run seed:sql`,
    '',
    ...statements,
    '',
  ].join('\n');

  await fs.writeFile(OUT, sql, 'utf8');
  console.log(`${rows.length} lugu → ${OUT}`);
  console.log('\nViima andmebaasi:');
  console.log('  npx wrangler d1 execute rahvanounikud --local  --file=data/seed-songs.sql');
  console.log('  npx wrangler d1 execute rahvanounikud --remote --file=data/seed-songs.sql');
}

main().catch((err) => {
  console.error('seed-songs ebaõnnestus:', err.message);
  process.exit(1);
});
