// Koostab nimekirja lugudest, mis vajavad käsitsi pilku.
//
// Automaatne sobitamine annab kolm halli ala ja neid ei näe kuskilt korraga:
//   1. link on üleval, aga kindlus madal — kõige ohtlikum, sest viga on nähtav
//      kuulajale ja mitte kellelegi teisele;
//   2. vaste jäi läve alla, nii et linki ei ole, aga pakkumine on olemas;
//   3. lugu on lihtsalt läbi käimata (YouTube'i päevakvoot).
//
// Väljund läheb data/review-list.md. Käivita pärast iga resolveri käiku:
//   npm run review

import fs from 'node:fs/promises';
import { paths } from './lib/paths.mjs';
import { CONFIDENCE_THRESHOLD } from './lib/match.mjs';
import { buildPage } from './review-page.mjs';

/** Läve ületanud, aga alla selle jäänud vasted väärivad üle vaatamist. */
const SHAKY = 0.85;

const read = async (f) => JSON.parse(await fs.readFile(f, 'utf8'));

function searchUrl(base, song) {
  return base + encodeURIComponent(`${song.artistsRaw} ${song.title}`);
}

const YT_SEARCH = 'https://www.youtube.com/results?search_query=';
const SP_SEARCH = 'https://open.spotify.com/search/';

function fmt(n) {
  return n === undefined || n === null ? '—' : n.toFixed(2).replace('.', ',');
}

async function main() {
  const data = await read(paths.episodes);
  const spotify = await read(paths.spotifyCache);
  const youtube = await read(paths.youtubeCache);
  const overrides = await read(paths.overrides);

  const manual = new Set(Object.keys(overrides.songs ?? {}));

  /* Neli korvi. Lugu satub ainult ühte — kõige tõsisemasse, mis talle sobib,
     muidu tuleks sama rida mitu korda ette ja nimekiri kaotaks mõtte. */
  const wrong = [];    // link üleval, kindlus madal
  const guess = [];    // linki ei ole, pakkumine on
  const blank = [];    // kumbagi linki ei ole ja pakkumist ka mitte
  const todo = [];     // YouTube veel otsimata

  for (const episode of data.episodes) {
    for (const song of episode.songs) {
      const sp = spotify[song.id];
      const yt = youtube[song.id];
      const row = {
        song,
        episode,
        käsitsi: manual.has(song.id),
        spConf: sp?.confidence,
        ytConf: yt?.confidence,
        spName: sp?.id ? `${(sp.artists ?? []).join(', ')} — ${sp.name}` : null,
        ytName: yt?.id ? yt.title : null,
        ytGuess: yt && !yt.id ? yt.bestGuess : null,
        ytGuessId: yt && !yt.id ? yt.bestGuessId : null,
        spGuess: sp && !sp.id ? sp.bestGuess : null,
      };

      /* Käsitsi kinnitatut ei kahtlusta — inimene on selle juba üle vaadanud. */
      const kahtlaneSp = song.spotifyId && !row.käsitsi && (row.spConf ?? 1) < SHAKY;
      const kahtlaneYt = song.youtubeId && !row.käsitsi && (row.ytConf ?? 1) < SHAKY;

      if (kahtlaneSp || kahtlaneYt) {
        wrong.push({ ...row, kahtlaneSp, kahtlaneYt });
      } else if (!song.youtubeId && yt) {
        guess.push(row);
      } else if (!song.youtubeId && !song.spotifyId) {
        blank.push(row);
      } else if (!song.youtubeId) {
        todo.push(row);
      }
    }
  }

  const nr = (e) => data.episodes.length - data.episodes.indexOf(e);
  for (const r of [...wrong, ...guess, ...blank, ...todo]) {
    r.nr = nr(r.episode);
    r.ytSearch = searchUrl(YT_SEARCH, r.song);
    r.spSearch = searchUrl(SP_SEARCH, r.song);
  }
  const line = (r) => `${r.song.artistsRaw} — ${r.song.title}`;
  const kust = (r) => `saade ${nr(r.episode)} · ${r.episode.publishedAt.slice(0, 10)}`;

  const out = [];
  out.push('# Ülevaatamist vajavad lood');
  out.push('');
  out.push(`Koostatud failist \`data/episodes.json\` (${data.episodes.length} saadet, `
    + `${data.episodes.reduce((n, e) => n + e.songs.length, 0)} lugu). `
    + `Kindluse lävi on ${CONFIDENCE_THRESHOLD}; alla ${SHAKY} loeme kahtlaseks.`);
  out.push('');
  out.push('| Korv | Lugusid |');
  out.push('|---|---|');
  out.push(`| Kahtlane link üleval | ${wrong.length} |`);
  out.push(`| Pakkumine olemas, link puudub | ${guess.length} |`);
  out.push(`| Kumbki link puudub | ${blank.length} |`);
  out.push(`| YouTube veel otsimata | ${todo.length} |`);
  out.push('');

  out.push('## 1. Kahtlane link on üleval');
  out.push('');
  out.push('Need on kuulajale juba nähtavad, seega vale link on siin halvem kui puuduv.');
  out.push('');
  out.push('Enamik neist on tegelikult õiged: kindlus langeb ka siis, kui YouTube\'i');
  out.push('pealkirjas artistit ei ole („kah mul asi") või kui pealkiri on veidi teisiti');
  out.push('kirjutatud („I LUV BEING MYSELF"). Nimekiri on madalaimast kindlusest ülespoole,');
  out.push('nii et tõelised vead on eespool — allapoole jõudes muutub üle vaatamine kiiresti');
  out.push('mõttetuks.');
  out.push('');
  if (wrong.length === 0) out.push('_Puhas._');
  const worst = (r) => Math.min(r.kahtlaneSp ? (r.spConf ?? 1) : 1, r.kahtlaneYt ? (r.ytConf ?? 1) : 1);
  for (const r of wrong.sort((a, b) => worst(a) - worst(b))) {
    out.push(`### ${line(r)}`);
    out.push(`\`${r.song.id}\` · ${kust(r)}`);
    if (r.kahtlaneSp) {
      out.push(`- **Spotify ${fmt(r.spConf)}** → ${r.spName}`);
      out.push(`  https://open.spotify.com/track/${r.song.spotifyId}`);
    }
    if (r.kahtlaneYt) {
      out.push(`- **YouTube ${fmt(r.ytConf)}** → ${r.ytName}`);
      out.push(`  https://www.youtube.com/watch?v=${r.song.youtubeId}`);
    }
    out.push(`- Otsi ise: [YouTube](${searchUrl(YT_SEARCH, r.song)}) · [Spotify](${searchUrl(SP_SEARCH, r.song)})`);
    out.push('');
  }

  out.push('## 2. Pakkumine olemas, aga jäi läve alla');
  out.push('');
  out.push('Otsing leidis midagi, kindlus jäi väikseks. Osa on õiged (pealkirjas lisasõna),');
  out.push('osa on täiesti mööda, osa on õige lugu vales versioonis.');
  out.push('');
  for (const r of guess.sort((a, b) => (b.ytConf ?? 0) - (a.ytConf ?? 0))) {
    out.push(`- **${fmt(r.ytConf)}** ${line(r)} — ${kust(r)}`);
    out.push(`  - pakub: ${r.ytGuess ?? '—'}`
      + (r.ytGuessId ? ` → https://www.youtube.com/watch?v=${r.ytGuessId}` : ''));
    out.push(`  - \`${r.song.id}\` · [otsi](${searchUrl(YT_SEARCH, r.song)})`);
  }
  out.push('');

  out.push('## 3. Kumbki link puudub');
  out.push('');
  out.push('Ei Spotifys ega YouTube\'is. Osa neist ei olegi voogedastuses.');
  out.push('');
  for (const r of blank) {
    out.push(`- ${line(r)} — ${kust(r)}`);
    out.push(`  - \`${r.song.id}\` · [YouTube](${searchUrl(YT_SEARCH, r.song)}) · [Spotify](${searchUrl(SP_SEARCH, r.song)})`);
  }
  out.push('');

  out.push('## 4. YouTube veel otsimata');
  out.push('');
  out.push(`${todo.length} lugu, päevakvoot 90 → ~${Math.ceil(todo.length / 90)} päeva.`);
  out.push('Spotify link on neil olemas, nii et lehel on lugu kuulatav.');
  out.push('');
  out.push('```bash');
  out.push('npm run resolve:youtube && npm run build:data && npm run deploy');
  out.push('```');
  out.push('');
  for (const r of todo) out.push(`- ${line(r)} — ${kust(r)}`);
  out.push('');

  out.push('---');
  out.push('');
  out.push('## Kuidas parandada');
  out.push('');
  out.push('Lisa `data/overrides.json` faili `songs` alla:');
  out.push('');
  out.push('```json');
  out.push('"loo-id-siia": {');
  out.push('  "_note": "miks käsitsi",');
  out.push('  "youtubeId": "videoId",');
  out.push('  "spotifyId": "trackId"');
  out.push('}');
  out.push('```');
  out.push('');
  out.push('Seejärel `npm run build:data && npm run deploy`. Käsitsi kinnitatud lood');
  out.push('kaovad sellest nimekirjast ära, ka siis kui automaatne kindlus jäi madalaks.');
  out.push('');

  await fs.writeFile(paths.reviewList, out.join('\n'), 'utf8');

  await fs.writeFile(paths.reviewPage, buildPage({
    wrong, guess, blank, todo,
    meta: {
      songs: data.episodes.reduce((n, e) => n + e.songs.length, 0),
      threshold: String(CONFIDENCE_THRESHOLD).replace('.', ','),
      shaky: String(SHAKY).replace('.', ','),
      naidisId: wrong[0]?.song.id ?? guess[0]?.song.id ?? 'loo-id-siia',
    },
  }), 'utf8');

  console.log(`Kahtlane link üleval:            ${wrong.length}`);
  console.log(`Pakkumine olemas, link puudub:   ${guess.length}`);
  console.log(`Kumbki link puudub:              ${blank.length}`);
  console.log(`YouTube otsimata:                ${todo.length}`);
  console.log(`\n→ ${paths.reviewList}`);
}

main().catch((err) => {
  console.error(`review-list ebaõnnestus: ${err.message}`);
  process.exit(1);
});
