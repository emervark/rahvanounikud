// Otsib igale loole Spotify track ID ja saate episoodidele episode ID.
//
// Kasutab Client Credentials voogu — kasutaja sisse ei logi, meil on vaja ainult
// avalikku otsingut. Spotify otsingul päevakvooti ei ole, nii et kõik ~376 lugu
// saab korraga läbi käia.
//
// Tulemused: data/spotify-cache.json ja data/spotify-episodes.json.
// Skript on korduvkäivitatav — juba lahendatud lugusid uuesti ei otsita.
//
// Käivita:  npm run resolve:spotify
//           npm run resolve:spotify -- --retry-failed   (proovi läbikukkunuid uuesti)
//           npm run resolve:spotify -- --limit 20       (proovi väikese hulgaga)

import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { paths } from './lib/paths.mjs';
import { requireEnv } from './lib/env.mjs';
import { CONFIDENCE_THRESHOLD, pickBest, similarity } from './lib/match.mjs';
import { SPOTIFY_SHOW_ID } from './feed-config.mjs';

const MARKET = 'EE';
const API = 'https://api.spotify.com/v1';

const args = process.argv.slice(2);
const retryFailed = args.includes('--retry-failed');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity;

async function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getToken(clientId, clientSecret) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spotify ei andnud tokenit (${res.status}): ${body.slice(0, 200)}`);
  }
  const { access_token } = await res.json();
  return access_token;
}

/** Ilma ajapiiranguta jäi skript korra rippuma — vastuseta päring ei tohi
 *  tervet käiku kinni panna, sest pooleli jäänud töö tuleks uuesti teha. */
const REQUEST_TIMEOUT = 20_000;

/** GET koos 429 (liiga palju päringuid) ootamise ja ajapiiranguga. */
async function apiGet(token, url, attempt = 0) {
  let res;
  try {
    res = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });
  } catch (err) {
    if (attempt > 3) throw new Error(`Spotify ei vastanud: ${err.message}`);
    console.log(`    (päring aegus, proovin uuesti ${attempt + 1}/3)`);
    await sleep(1000 * (attempt + 1));
    return apiGet(token, url, attempt + 1);
  }

  if (res.status === 429) {
    const wait = Number(res.headers.get('retry-after') ?? 2) + 1;
    if (attempt > 5) throw new Error('Spotify piirab päringuid liiga kaua.');
    console.log(`    (Spotify palub oodata ${wait}s)`);
    await sleep(wait * 1000);
    return apiGet(token, url, attempt + 1);
  }

  if (!res.ok) throw new Error(`Spotify ${res.status}: ${(await res.text()).slice(0, 150)}`);
  return res.json();
}

function toCandidates(json) {
  return (json.tracks?.items ?? []).map((t) => ({
    id: t.id,
    title: t.name,
    artists: t.artists.map((a) => a.name),
    album: t.album?.name ?? null,
    url: t.external_urls?.spotify ?? null,
  }));
}

/**
 * Kaks otsingut: kõigepealt väljadega piiratud (täpsem), siis vaba tekst.
 * Vaba tekst leiab lood, mille kirjapilt meil ja Spotifys erineb rohkem.
 */
async function searchTrack(token, song) {
  const artist = song.artists[0] ?? '';
  const queries = [
    `track:"${song.title}" artist:"${artist}"`,
    `${artist} ${song.title}`,
  ];

  const seen = new Map();
  for (const q of queries) {
    const url = `${API}/search?q=${encodeURIComponent(q)}&type=track&market=${MARKET}&limit=10`;
    const json = await apiGet(token, url);
    for (const c of toCandidates(json)) if (!seen.has(c.id)) seen.set(c.id, c);
    // Kui esimene, täpsem päring andis juba veenva vaste, teist ei ole vaja.
    const { best } = pickBest(song, [...seen.values()]);
    if (best && best.score >= 0.95) break;
  }
  return [...seen.values()];
}

/**
 * Saate episoodid, et mängija saaks näidata just seda osa, mitte tervet saadet.
 *
 * NB: Spotify ütleb, et saatel on 91 episoodi, aga API tagastab neist osa `null`-ina.
 * See on Spotify enda piirang client-credentials tokeni puhul (ilma kasutaja
 * kontekstita ei ole kõigile episoodidele ligipääsu), mitte lehekülgede viga —
 * kontrollitud, et päringud tulevad mõlemal lehel ja ka ilma turumääranguta sama.
 * Ülejäänud saated kasutavad mängijana kogu saate embedit, kust saab osa ise valida.
 */
async function resolveEpisodes(token, episodes, cache) {
  console.log('\nSaate episoodid...');
  const all = [];
  let url = `${API}/shows/${SPOTIFY_SHOW_ID}/episodes?market=${MARKET}&limit=50`;
  let returned = 0;

  while (url) {
    const page = await apiGet(token, url);
    returned += (page.items ?? []).length;
    all.push(...(page.items ?? []).filter(Boolean));
    url = page.next;
  }
  console.log(`  Spotify tagastas ${returned} kirjet, neist kasutatavaid ${all.length}`);

  let matched = 0;
  for (const ep of episodes) {
    if (cache[ep.guid]) { matched++; continue; }

    const scored = all
      .map((s) => ({
        s,
        score: similarity(ep.title, s.name)
          // Sama kuupäev on tugev kinnitus, eri kuupäev tugev vastuargument.
          + (s.release_date === ep.publishedAt.slice(0, 10) ? 0.25 : -0.1),
      }))
      .sort((a, b) => b.score - a.score);

    if (scored[0] && scored[0].score >= 0.8) {
      cache[ep.guid] = {
        id: scored[0].s.id,
        name: scored[0].s.name,
        confidence: Math.min(1, scored[0].score),
      };
      matched++;
    }
  }
  console.log(`  Seotud: ${matched}/${episodes.length}`);
  return cache;
}

async function main() {
  const [clientId, clientSecret] = requireEnv(
    ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'],
    'Võtmed saab: https://developer.spotify.com/dashboard (vt SEADISTAMINE.md peatükk 3)',
  );

  const data = await readJson(paths.episodes, null);
  if (!data) throw new Error('data/episodes.json puudub — käivita esmalt "npm run data".');

  const cache = await readJson(paths.spotifyCache, {});
  const episodeCache = await readJson(paths.spotifyEpisodes, {});

  console.log('Küsin Spotifylt tokenit...');
  const token = await getToken(clientId, clientSecret);

  const songs = data.episodes.flatMap((ep) => ep.songs);
  const todo = songs.filter((s) => {
    const cached = cache[s.id];
    if (!cached) return true;
    return retryFailed && !cached.id;
  }).slice(0, limit);

  console.log(`\nLugusid kokku: ${songs.length}`);
  console.log(`Juba lahendatud: ${songs.filter((s) => cache[s.id]?.id).length}`);
  console.log(`Otsin nüüd: ${todo.length}\n`);

  let found = 0, weak = 0, missing = 0;
  const review = [];

  for (const [i, song] of todo.entries()) {
    const label = `${song.artistsRaw} — ${song.title}`;
    let candidates = [];
    try {
      candidates = await searchTrack(token, song);
    } catch (err) {
      console.error(`  VIGA  ${label}: ${err.message}`);
      continue;
    }

    const { best } = pickBest(song, candidates);

    if (best && best.score >= CONFIDENCE_THRESHOLD) {
      cache[song.id] = {
        id: best.candidate.id,
        name: best.candidate.title,
        artists: best.candidate.artists,
        confidence: Number(best.score.toFixed(3)),
      };
      found++;
    } else {
      // Meelega ei salvesta ID-d: parem otsingulink kui vale lugu.
      cache[song.id] = {
        id: null,
        confidence: best ? Number(best.score.toFixed(3)) : 0,
        bestGuess: best ? `${best.candidate.artists.join(', ')} — ${best.candidate.title}` : null,
        bestGuessId: best?.candidate.id ?? null,
      };
      if (best) { weak++; review.push({ song: label, guess: cache[song.id].bestGuess, score: best.score }); }
      else missing++;
    }

    if ((i + 1) % 25 === 0 || i === todo.length - 1) {
      console.log(`  ${i + 1}/${todo.length}  (leitud ${found}, nõrk ${weak}, puudu ${missing})`);
      await fs.writeFile(paths.spotifyCache, JSON.stringify(cache, null, 2) + '\n', 'utf8');
    }
    await sleep(120);  // viisakas tempo
  }

  await fs.writeFile(paths.spotifyCache, JSON.stringify(cache, null, 2) + '\n', 'utf8');

  const eps = await resolveEpisodes(token, data.episodes, episodeCache);
  await fs.writeFile(paths.spotifyEpisodes, JSON.stringify(eps, null, 2) + '\n', 'utf8');

  const total = songs.filter((s) => cache[s.id]?.id).length;
  console.log(`\nKokku lahendatud: ${total}/${songs.length} lugu`);

  if (review.length) {
    console.log(`\n${review.length} lugu jäi lahendamata, sest vaste polnud piisavalt kindel.`);
    console.log('Need näitavad lehel otsingulinki. Parimad oletused:');
    for (const r of review.slice(0, 15)) {
      console.log(`  ${r.score.toFixed(2)}  ${r.song}`);
      console.log(`        oletus: ${r.guess}`);
    }
    if (review.length > 15) console.log(`  ... ja veel ${review.length - 15}`);
    console.log('\nÕige ID saab käsitsi lisada data/overrides.json faili "songs" alla.');
  }

  console.log('\nJärgmisena: npm run build:data');
}

main().catch((err) => {
  console.error('\nresolve-spotify ebaõnnestus:', err.message);
  process.exit(1);
});
