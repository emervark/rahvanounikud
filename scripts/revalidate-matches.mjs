// Vaatab juba salvestatud Spotify/YouTube vasted uuesti üle.
//
// Sobitamise reeglid muutuvad, kui päris andmetes tuleb välja uus muster. Vanad
// vasted jäävad aga cache'i sisse ja neid ei kontrolliks keegi kunagi üle — nii
// jääks vale lugu igaveseks lehele. See skript käib nad läbi ilma ühegi API
// päringuta, kasutades cache'i salvestatud pealkirju.
//
// Kahtlaseks jäänud vaste ID kustutatakse, nii et järgmine resolver otsib uuesti.
//
// Käivita:  node scripts/revalidate-matches.mjs           (ainult raport)
//           node scripts/revalidate-matches.mjs --apply    (kustuta kahtlased)

import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { paths } from './lib/paths.mjs';
import {
  tokenSimilarity, similarity, splitVariant, variantKind, stripFeat, isPrefixMatch,
  spacelessEqual, decodeHtmlEntities,
} from './lib/match.mjs';

const apply = process.argv.includes('--apply');

/** Pealkirjade lävend. Madalam kui otsingul, sest siin on ainult pealkiri teada. */
const TITLE_FLOOR = 0.6;

async function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function checkOne(ourTitle, theirTitle) {
  const their = decodeHtmlEntities(theirTitle);

  // Sama leebused mis otsingul: kaasesitaja pealkirjas ja eraldajaga selgitav
  // lisa on tuntud-head mustrid, mitte vale sõna.
  const ourBase = splitVariant(ourTitle).base;
  const theirBase = splitVariant(their).base;
  const token = (isPrefixMatch(ourBase, theirBase) || spacelessEqual(ourBase, theirBase))
    ? 1 : Math.max(
    tokenSimilarity(ourTitle, their),
    tokenSimilarity(ourBase, theirBase),
    tokenSimilarity(stripFeat(ourTitle), stripFeat(their)),
    tokenSimilarity(stripFeat(ourBase), stripFeat(theirBase)),
  );
  const chars = similarity(ourTitle, their);

  // Remiks/live ühel pool ja mitte teisel → eri lugu.
  const ourKind = variantKind(splitVariant(ourTitle).variant);
  const theirKind = variantKind(splitVariant(their).variant);
  const variantMismatch = (ourKind === 'tugev') !== (theirKind === 'tugev');

  return {
    token, chars, variantMismatch,
    suspect: token < TITLE_FLOOR || variantMismatch,
  };
}

async function revalidate(name, cacheFile, titleField, songsById) {
  const cache = await readJson(cacheFile, {});
  const suspects = [];
  let checked = 0;

  for (const [songId, entry] of Object.entries(cache)) {
    if (songId === '_kvoot' || !entry?.id) continue;
    const song = songsById[songId];
    if (!song) continue;

    checked++;
    const result = checkOne(song.title, entry[titleField]);
    if (result.suspect) {
      suspects.push({ songId, song, entry, result });
    }
  }

  console.log(`\n${name}: kontrollitud ${checked}, kahtlast ${suspects.length}`);
  for (const s of suspects) {
    console.log(`  sõnad ${s.result.token.toFixed(2)}  ${s.song.artistsRaw} — ${s.song.title}`);
    console.log(`                 vaste: ${decodeHtmlEntities(s.entry[titleField])}`
      + (s.result.variantMismatch ? '   [remiks/live lahknevus]' : ''));
  }

  if (apply && suspects.length) {
    for (const s of suspects) {
      cache[s.songId] = {
        id: null,
        confidence: 0,
        bestGuess: decodeHtmlEntities(s.entry[titleField]),
        bestGuessId: s.entry.id,
        _eemaldatud: 'ülevaatusel kahtlaseks tunnistatud',
      };
    }
    await fs.writeFile(cacheFile, JSON.stringify(cache, null, 2) + '\n', 'utf8');
    console.log(`  → ${suspects.length} vastet eemaldatud, otsitakse uuesti`);
  }

  return suspects.length;
}

async function main() {
  const data = await readJson(paths.episodes, null);
  if (!data) throw new Error('data/episodes.json puudub.');

  const songsById = {};
  for (const ep of data.episodes) for (const s of ep.songs) songsById[s.id] = s;

  const a = await revalidate('Spotify', paths.spotifyCache, 'name', songsById);
  const b = await revalidate('YouTube', paths.youtubeCache, 'title', songsById);

  console.log(`\nKokku kahtlasi: ${a + b}`);
  if (!apply && a + b > 0) {
    console.log('\nEemaldamiseks: node scripts/revalidate-matches.mjs --apply');
    console.log('Seejärel otsi uuesti: npm run resolve:spotify -- --retry-failed');
  }
}

main().catch((err) => {
  console.error('revalidate ebaõnnestus:', err.message);
  process.exit(1);
});
