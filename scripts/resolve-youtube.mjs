// Otsib lugudele YouTube'i video ID.
//
// YouTube Data API kvoot on 10 000 ühikut päevas ja üks otsing maksab 100 —
// ehk 100 otsingut päevas. 376 lugu tähendab ~4 päeva. Seepärast peab skript
// oma päevast kulu ise arvestama ja pooleli jäänud kohast jätkama.
//
// Kuni ID puudub, näitab leht YouTube'i otsingulinki. Leht töötab kogu aeg.
//
// Käivita:  npm run resolve:youtube
//           npm run resolve:youtube -- --limit 30
//           npm run resolve:youtube -- --retry-failed

import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { paths } from './lib/paths.mjs';
import { requireEnv } from './lib/env.mjs';
import { CONFIDENCE_THRESHOLD, pickBest } from './lib/match.mjs';

const SEARCH_COST = 100;
const DAILY_QUOTA = 10_000;
/** Varu, et muud tegevused kvooti üle ei ajaks. */
const DEFAULT_DAILY_SEARCHES = 90;

const args = process.argv.slice(2);
const retryFailed = args.includes('--retry-failed');
const limitIdx = args.indexOf('--limit');
const cliLimit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

/** YouTube'i pealkirjades on palju müra, mis pole loo nimi. */
const NOISE = /\s*[([]?\s*\b(official\s+(music\s+)?(video|audio|visualizer|lyric\s+video)?|official|lyrics?|lyric\s+video|audio|visualizer|music\s+video|hd|hq|4k|full\s+album|with\s+lyrics|out\s+now|premiere)\b[^)\]]*[)\]]?\s*/gi;

function cleanTitle(s) {
  return String(s ?? '')
    .replace(NOISE, ' ')
    .replace(/\s*\|\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Üks video annab mitu tõlgendust, sest YouTube'i pealkiri ei ole struktureeritud:
 *   "Artist - Pealkiri (Official Video)"  → artist ja pealkiri pealkirjas
 *   "Pealkiri"  kanalilt "Artist"         → artist on kanali nimi
 * Skoorime mõlemat ja võtame parema.
 */
function toCandidates(item) {
  const videoId = item.id?.videoId;
  if (!videoId) return [];

  const rawTitle = cleanTitle(item.snippet?.title ?? '');
  const channel = (item.snippet?.channelTitle ?? '').replace(/\s*-\s*Topic$/i, '').trim();

  const out = [{ id: videoId, title: rawTitle, artists: [channel].filter(Boolean) }];

  const dash = rawTitle.match(/^(.{2,60}?)\s+[-–—]\s+(.+)$/);
  if (dash) {
    out.push({
      id: videoId,
      title: dash[2].trim(),
      artists: [dash[1].trim(), channel].filter(Boolean),
    });
  }
  return out;
}

async function search(apiKey, song) {
  const q = `${song.artists.join(' ')} ${song.title}`;
  const url = 'https://www.googleapis.com/youtube/v3/search?'
    + new URLSearchParams({
      key: apiKey,
      part: 'snippet',
      q,
      type: 'video',
      // Mitte-embeditavat videot ei saa lehel mängida — see annaks kasutajale
      // veateate iframe'i sees, mis on halvem kui otsingulink.
      videoEmbeddable: 'true',
      videoCategoryId: '10',  // Music
      maxResults: '10',
    });

  const res = await fetch(url);
  if (res.status === 403) {
    const body = await res.json().catch(() => ({}));
    const reason = body?.error?.errors?.[0]?.reason ?? '';
    if (reason === 'quotaExceeded') {
      const err = new Error('YouTube päevakvoot on täis. Jätka homme sama käsuga.');
      err.quotaExceeded = true;
      throw err;
    }
    throw new Error(`YouTube 403: ${body?.error?.message ?? reason}`);
  }
  if (!res.ok) throw new Error(`YouTube ${res.status}: ${(await res.text()).slice(0, 150)}`);

  const json = await res.json();
  return (json.items ?? []).flatMap(toCandidates);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  const [apiKey] = requireEnv(
    ['YOUTUBE_API_KEY'],
    'Võtme saab Google Cloudist (vt SEADISTAMINE.md peatükk 2.3).',
  );

  const data = await readJson(paths.episodes, null);
  if (!data) throw new Error('data/episodes.json puudub — käivita esmalt "npm run data".');

  const cache = await readJson(paths.youtubeCache, {});

  // Päevaarvestus elab cache'i sees, et see üle käivituste säiliks.
  const usage = cache._kvoot ?? { date: today(), searches: 0 };
  if (usage.date !== today()) { usage.date = today(); usage.searches = 0; }

  const remainingToday = DEFAULT_DAILY_SEARCHES - usage.searches;
  if (remainingToday <= 0) {
    console.log(`Tänane kvoot on kasutatud (${usage.searches} otsingut).`);
    console.log('Jätka homme sama käsuga — juba lahendatud lugusid uuesti ei otsita.');
    return;
  }

  const songs = data.episodes.flatMap((ep) => ep.songs);
  const todo = songs
    .filter((s) => {
      const c = cache[s.id];
      if (!c) return true;
      return retryFailed && !c.id;
    })
    .slice(0, Math.min(remainingToday, cliLimit ?? Infinity));

  const done = songs.filter((s) => cache[s.id]?.id).length;
  console.log(`Lugusid kokku: ${songs.length}`);
  console.log(`Juba lahendatud: ${done}`);
  console.log(`Tänane kvoot: ${usage.searches}/${DEFAULT_DAILY_SEARCHES} otsingut kasutatud`);
  console.log(`Otsin nüüd: ${todo.length}\n`);

  if (todo.length === 0) {
    console.log('Midagi otsida ei ole.');
    return;
  }

  let found = 0, weak = 0;
  const save = async () => {
    cache._kvoot = usage;
    await fs.writeFile(paths.youtubeCache, JSON.stringify(cache, null, 2) + '\n', 'utf8');
  };

  for (const [i, song] of todo.entries()) {
    let candidates;
    try {
      candidates = await search(apiKey, song);
      usage.searches++;
    } catch (err) {
      await save();
      if (err.quotaExceeded) {
        console.log(`\n${err.message}`);
        console.log(`Selle käiguga sai lahendatud ${found} lugu.`);
        return;
      }
      throw err;
    }

    const { best } = pickBest(song, candidates);

    if (best && best.score >= CONFIDENCE_THRESHOLD) {
      cache[song.id] = {
        id: best.candidate.id,
        title: best.candidate.title,
        confidence: Number(best.score.toFixed(3)),
      };
      found++;
    } else {
      cache[song.id] = {
        id: null,
        confidence: best ? Number(best.score.toFixed(3)) : 0,
        bestGuess: best ? `${best.candidate.artists.join(', ')} — ${best.candidate.title}` : null,
        bestGuessId: best?.candidate.id ?? null,
      };
      weak++;
    }

    if ((i + 1) % 10 === 0 || i === todo.length - 1) {
      console.log(`  ${i + 1}/${todo.length}  (leitud ${found}, nõrk ${weak})`);
      await save();
    }
    await sleep(100);
  }

  await save();

  const total = songs.filter((s) => cache[s.id]?.id).length;
  const left = songs.length - Object.keys(cache).filter((k) => k !== '_kvoot').length;

  console.log(`\nKokku lahendatud: ${total}/${songs.length}`);
  console.log(`Tänane kvoot: ${usage.searches}/${DEFAULT_DAILY_SEARCHES}`);
  if (left > 0) {
    console.log(`\nLäbi käimata: ${left} lugu (~${Math.ceil(left / DEFAULT_DAILY_SEARCHES)} päeva).`);
    console.log('Jätka homme: npm run resolve:youtube');
  }
  console.log('\nJärgmisena: npm run build:data');
}

main().catch((err) => {
  console.error('\nresolve-youtube ebaõnnestus:', err.message);
  process.exit(1);
});
