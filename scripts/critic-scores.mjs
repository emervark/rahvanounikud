// Genereerib ja hoiab faili data/critic-scores.json, kuhu kriitikute hinded
// käsitsi sisestada.
//
// Miks käsitsi: podcasti kirjeldustes numbrilisi hindeid EI ole. Kontrollitud —
// 91 kirjelduse peale on üksainus sõna "punktisumma" ja seegi jutu sees, mitte
// numbrina. Kriitikute hinded kõlavad ainult helis, nii et neid saab kirja
// panna ainult saadet kuulates.
//
// Fail on tahtlikult loetav: iga lugu on eraldi real koos artisti, pealkirja ja
// saatenumbriga, saadete kaupa järjest. Nii saab ühte saadet kuulates täita ühe
// ploki ja otsinguga õige koha üles leida.
//
// Skoor tohib olla:
//   number                          — nõunike ühine hinne
//   { "Nimi": number, ... }         — iga kriitiku hinne eraldi, keskmine arvutatakse
//   null                            — veel sisestamata
//
// Käivita: npm run critics

import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { paths, DATA_DIR } from './lib/paths.mjs';

const OUT = path.join(DATA_DIR, 'critic-scores.json');

async function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function label(song, episodeNumber) {
  return `${song.artistsRaw} — ${song.title} · saade ${episodeNumber}`;
}

async function main() {
  const data = await readJson(paths.episodes, null);
  if (!data) throw new Error('data/episodes.json puudub — käivita esmalt "npm run data".');

  const existing = await readJson(OUT, {});

  const out = {
    _juhend: [
      'Kriitikute hinded saadetest. Täida "skoor" väli.',
      '',
      'skoor võib olla:',
      '  8            — nõunike ühine hinne',
      '  { "Raul Saaremets": 8, "Siim Nestor": 6 }  — iga kriitik eraldi, keskmine arvutatakse',
      '  null         — veel sisestamata',
      '',
      'Pärast täitmist: npm run build:data && npm run deploy',
      'Uute saadete lisandudes: npm run critics (olemasolevad väärtused jäävad alles)',
    ],
  };

  const total = data.episodes.length;
  let kept = 0;
  let added = 0;

  data.episodes.forEach((ep, i) => {
    const number = total - i;
    for (const song of ep.songs) {
      const prev = existing[song.id];
      // Olemasolev sisestus jääb alati alles — silt uuendatakse, skoor mitte.
      out[song.id] = {
        _: label(song, number),
        skoor: prev?.skoor ?? null,
      };
      if (prev?.skoor != null) kept++; else added++;
    }
  });

  await fs.writeFile(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8');

  const songs = kept + added;
  console.log(`${songs} lugu → ${OUT}`);
  console.log(`Sisestatud: ${kept}, ootab sisestamist: ${added}`);
  console.log('\nAva fail redaktoris ja täida "skoor" väljad saadet kuulates.');
  console.log('Seejärel: npm run build:data');
}

main().catch((err) => {
  console.error('critic-scores ebaõnnestus:', err.message);
  process.exit(1);
});
