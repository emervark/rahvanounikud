// Kannab ülevaatuslehel tehtud otsused data/overrides.json faili.
//
// Leht ise ei saa repos midagi kirjutada — ta hoiab otsuseid enda küljes ja
// need tuuakse siia data/review-decisions.json kaudu. See skript teeb neist
// päris override'id, mida build-data arvestab.
//
// Käivita:  npm run review:apply
//           npm run review:apply -- --dry   (näita, ära kirjuta)

import fs from 'node:fs/promises';
import { paths } from './lib/paths.mjs';

const dry = process.argv.slice(2).includes('--dry');

const read = async (f, fallback) => {
  try {
    return JSON.parse(await fs.readFile(f, 'utf8'));
  } catch {
    return fallback;
  }
};

/**
 * Ühest otsusest üks override.
 *
 * `vale` tähendab „seda linki ei ole" ja kirjutab selgesõnalise nulli —
 * build-data vaatab võtme olemasolu, nii et null kustutab lingi päriselt
 * ega kuku vahemälu juurde tagasi. Kui kumbagi linki polnud, nullime
 * mõlemad, muidu leiaks järgmine resolveri käik loo uuesti üles.
 */
function override(otsus) {
  const rida = { _note: otsus.märkus ?? 'käsitsi üle vaadatud ülevaatuslehel' };

  if (otsus.laad === 'vale') {
    if (otsus.mis === 'sp') rida.spotifyId = null;
    else if (otsus.mis === 'yt') rida.youtubeId = null;
    else { rida.spotifyId = null; rida.youtubeId = null; }
    return rida;
  }

  if (otsus.yt) rida.youtubeId = otsus.yt;
  if (otsus.sp) rida.spotifyId = otsus.sp;
  /* Kolmandad allikad tulevad lehelt sama teed — SoundCloudil permalink,
     Bandcampil embed-koodist välja noritud ID-d. */
  if (otsus.sc) rida.soundcloudUrl = otsus.sc;
  if (otsus.bc) rida.bandcamp = otsus.bc;
  return rida;
}

async function main() {
  const otsused = await read(paths.reviewOtsused, {});
  const overrides = await read(paths.overrides, {});
  overrides.songs ??= {};

  const ids = Object.keys(otsused);
  if (ids.length === 0) {
    console.log('Otsuseid ei ole — data/review-decisions.json on tühi või puudub.');
    return;
  }

  let uusi = 0;
  let muutunud = 0;
  let samad = 0;

  for (const id of ids) {
    const uus = override(otsused[id]);
    const vana = overrides.songs[id];

    /* Liidame, mitte ei asenda. Override võib sisaldada välju, millest leht
       midagi ei tea — käsitsi parandatud pealkiri, kriitikute hinne. Asendav
       variant pühkis need minema: NOID-i pealkirjaparandus kadus järgmise
       apply-käiguga ja alles jäi märkus, mis rääkis parandusest, mida enam ei
       olnud. */
    const liidetud = { ...(vana ?? {}), ...uus };
    if (vana?._note) liidetud._note = vana._note;

    if (!vana) {
      uusi++;
    } else if (JSON.stringify(vana) === JSON.stringify(liidetud)) {
      samad++;
      continue;
    } else {
      muutunud++;
    }
    overrides.songs[id] = liidetud;
  }

  console.log(`Otsuseid lehel:      ${ids.length}`);
  console.log(`Uut override'i:      ${uusi}`);
  console.log(`Muudetud:            ${muutunud}`);
  console.log(`Juba samad:          ${samad}`);
  console.log(`Kokku songs-plokis:  ${Object.keys(overrides.songs).length}`);

  if (dry) {
    console.log('\n--dry: faili ei kirjutatud.');
    return;
  }

  await fs.writeFile(paths.overrides, JSON.stringify(overrides, null, 2) + '\n', 'utf8');
  console.log(`\n→ ${paths.overrides}`);
  console.log('Järgmisena: npm run build:data && npm run deploy');
}

main().catch((err) => {
  console.error(`apply-review ebaõnnestus: ${err.message}`);
  process.exit(1);
});
