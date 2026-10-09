// Kannab hindelehel sisestatud nõunike hinded faili data/critic-scores.json.
//
// Leht ise ei saa repos midagi kirjutada — ta hoiab hindeid enda küljes ja
// need tuuakse siia data/critic-inbox.json kaudu (lehe „Sisestatud hinded"
// ploki sisu, üks objekt kujul { loo-id: { "Nimi": 8, ... } }).
//
// Käivita:  npm run critics:apply
//           npm run critics:apply -- --dry   (näita, ära kirjuta)

import fs from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { DATA_DIR } from './lib/paths.mjs';

const INBOX = path.join(DATA_DIR, 'critic-inbox.json');
const SCORES = path.join(DATA_DIR, 'critic-scores.json');

const dry = process.argv.slice(2).includes('--dry');

async function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

/** Ainult täisnumbrid 1–10 pääsevad läbi. */
function puhasta(rida) {
  const välja = {};
  for (const [nimi, v] of Object.entries(rida ?? {})) {
    if (Number.isInteger(v) && v >= 1 && v <= 10) välja[nimi] = v;
  }
  return välja;
}

async function main() {
  const sisse = await readJson(INBOX, null);
  if (!sisse) {
    console.log(`${INBOX} puudub.`);
    console.log('Kopeeri hindelehelt „Sisestatud hinded" plokk sinna faili ja käivita uuesti.');
    return;
  }

  const scores = await readJson(SCORES, {});
  const ids = Object.keys(sisse).filter((k) => !k.startsWith('_'));

  let uusi = 0, muutunud = 0, samad = 0, tundmatud = 0, ülekirjutatud = 0;

  for (const id of ids) {
    const uus = puhasta(sisse[id]);
    if (!Object.keys(uus).length) continue;

    const rida = scores[id];
    if (!rida) { tundmatud++; continue; }   // ID-d ei ole selles andmestikus

    const vana = rida.skoor;

    /* Üksik number tähendas „nõunike ühine hinne" — kriitikute kaupa täidetud
       rida on täpsem, seega ta võidab. Ütleme seda välja, sest vana väärtus
       kaob ja hiljem ei ole seda kuskilt tagasi vaadata. */
    if (typeof vana === 'number') ülekirjutatud++;

    /* Liidame kriitikute kaupa, mitte ei asenda: kaks inimest võivad sama loo
       kallal töötada eri kriitikute hinnetega, ja teine salvestus ei tohi
       esimese tööd kustutada. */
    const liidetud = typeof vana === 'object' && vana
      ? { ...puhasta(vana), ...uus }
      : uus;

    if (JSON.stringify(vana) === JSON.stringify(liidetud)) { samad++; continue; }
    if (vana == null) uusi++; else muutunud++;
    scores[id] = { ...rida, skoor: liidetud };
  }

  const kokku = Object.keys(scores).filter((k) => !k.startsWith('_'));
  const täidetud = kokku.filter((k) => scores[k].skoor != null).length;

  console.log(`Ridu lehelt:         ${ids.length}`);
  console.log(`Uut hinnet:          ${uusi}`);
  console.log(`Täiendatud:          ${muutunud}`);
  console.log(`Juba samad:          ${samad}`);
  if (tundmatud) console.log(`Tundmatu ID:         ${tundmatud}  (lugu ei ole andmestikus)`);
  if (ülekirjutatud) {
    console.log(`\nMÄRKUS — ${ülekirjutatud} lool asendus üksik ühishinne kriitikute kaupa ` +
                'jaotusega. Vana number kaob.');
  }
  console.log(`\nHinnatud kokku:      ${täidetud}/${kokku.length}`);

  if (dry) {
    console.log('\n--dry: faili ei kirjutatud.');
    return;
  }

  await fs.writeFile(SCORES, JSON.stringify(scores, null, 2) + '\n', 'utf8');
  console.log(`\n→ ${SCORES}`);
  console.log('Järgmisena: npm run build:data && npm run deploy');
}

main().catch((err) => {
  console.error(`apply-critics ebaõnnestus: ${err.message}`);
  process.exit(1);
});
