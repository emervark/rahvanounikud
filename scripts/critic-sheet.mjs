// Ehitab data/critic-sheet.html — hindelehe, kuhu saab saadet kuulates kriitikute
// hinded sisestada. Leht avaldab ennast ise uuesti, nii et sisestused püsivad ka
// teistele avajatele: seda saab jagada ja paluda abi.
//
// Miks üldse: numbrilisi hindeid podcasti kirjeldustes EI ole ja kriitikud ise
// neid ei talletanud. Ainus tee on saadet kuulata ja kirja panna — ja seda tööd
// jagub 91 saate jagu, seega peab seda saama mitme peale jagada.
//
// Leht on andmepõhine: siin sünnib ainult kest ja kaks JSON-plokki, kogu
// renderdus käib brauseris. Teisiti ei saakski — leht peab endast uue
// täisdokumendi kokku panema, ja selleks peab tal olema oma lähtekood käes.
//
// Käivita: npm run sheet

import fs from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { paths, DATA_DIR } from './lib/paths.mjs';
import { APP } from './critic-app.mjs';

const OUT_HTML = path.join(DATA_DIR, 'critic-sheet.html');
const GUESTS = path.join(DATA_DIR, 'guest-critics.json');
const SCORES = path.join(DATA_DIR, 'critic-scores.json');

/** Neli püsinõunikku. Külaline lisandub saate kaupa. */
const PÜSI = ['Raul Saaremets', 'Valner Valme', 'Siim Nestor', 'Merit Maarits'];

async function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

/**
 * Olemasolevad hinded lehe kujule.
 *
 * critic-scores.json lubab skoori ka üheainsa numbrina („nõunike ühine hinne").
 * Leht töötab kriitikute kaupa, nii et üksik number läheks siin kaotsi. Selle
 * asemel jätame ta puutumata ja märgime loo ära — apply-critics ei kirjuta
 * sellist rida üle enne, kui keegi on lehel kriitikute kaupa täitnud.
 */
function loeHinded(scores) {
  const välja = {};
  const üksikud = [];
  for (const [id, rida] of Object.entries(scores)) {
    if (id.startsWith('_')) continue;
    const s = rida?.skoor;
    if (s && typeof s === 'object') {
      const puhas = {};
      for (const [nimi, v] of Object.entries(s)) {
        if (typeof v === 'number' && Number.isFinite(v)) puhas[nimi] = v;
      }
      if (Object.keys(puhas).length) välja[id] = puhas;
    } else if (typeof s === 'number') {
      üksikud.push(id);
    }
  }
  return { hinded: välja, üksikud };
}

export async function buildSheet() {
  const data = await readJson(paths.episodes, null);
  if (!data) throw new Error('data/episodes.json puudub — käivita esmalt "npm run data".');

  const guests = await readJson(GUESTS, { saated: {} });
  const scores = await readJson(SCORES, {});
  const { hinded, üksikud } = loeHinded(scores);

  const N = data.episodes.length;
  const saated = data.episodes.map((ep, i) => {
    const nr = N - i;
    const külaline = guests.saated?.[ep.guid]?.nimi ?? null;
    /* Kõik neli püsinõunikku on alati veerus, ka siis kui keegi saates ei
       osalenud. Kes puudus, jääb tühjaks ja keskmine teda ei arvesta — see on
       aus, sest osalejate nimekirja kirjeldustest välja lugeda ei saa: seal on
       nimetatud ainult see, kes loo valis. */
    const kriitikud = külaline ? [...PÜSI, külaline] : [...PÜSI];
    return {
      nr,
      guid: ep.guid,
      pealkiri: ep.title,
      kuupäev: ep.publishedAt.slice(0, 10),
      külalised: külaline,
      kriitikud,
      lood: ep.songs.map((s) => ({
        id: s.id,
        esitaja: s.artistsRaw,
        pealkiri: s.title,
        kriitikud,
      })),
    };
  });

  const lugusid = saated.reduce((n, s) => n + s.lood.length, 0);
  const html = leht({ saated, lugusid }, hinded);
  await fs.writeFile(OUT_HTML, html, 'utf8');

  const tehtud = saated.reduce(
    (n, s) => n + s.lood.filter((l) => hinded[l.id]).length, 0);

  console.log(`${saated.length} saadet, ${lugusid} lugu → ${OUT_HTML}`);
  console.log(`Külaliskriitikuid nimeliselt: ${Object.keys(guests.saated ?? {}).length}`);
  console.log(`Juba hinnatud: ${tehtud}/${lugusid}`);
  if (üksikud.length) {
    console.log(`\nMÄRKUS — ${üksikud.length} lool on skoor üheainsa numbrina, ` +
                'mitte kriitikute kaupa. Neid leht ei näita täidetuna.');
  }
  return OUT_HTML;
}

function leht(andmed, hinded) {
  return `<!doctype html>
<html lang="et">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nõunike hinded</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;800&family=Space+Mono:wght@400;700&display=swap">
<style id="css">${CSS}</style>
</head>
<body>
<div id="kest">${KEST(andmed)}</div>
<script type="application/json" id="andmed">${json(andmed)}</script>
<script type="application/json" id="hinded">${json(hinded)}</script>
<script id="app">${APP}</script>
</body>
</html>
`;
}

const KEST = (a) => `
  <header class="masthead">
    <p class="eyebrow">Rahvanõunikud · nõunike hinded</p>
    <h1>Mis hinde nõunikud andsid</h1>
    <p class="lede">
      „Muusikanõunike” saadetes annavad kriitikud igale loole hinde, aga
      ükski neist numbritest ei ole kuskil kirjas — ei podcasti kirjelduses
      ega kriitikute endi märkmetes. Ainus viis need kätte saada on saadet
      kuulata ja üles kirjutada.
    </p>
    <p class="lede">
      Ava saade, kirjuta iga nõuniku hinne oma lahtrisse ja vajuta
      <b>Salvesta lehele</b>. Leht jätab meelde, ka teistele avajatele, nii et
      seda tööd saab mitme peale jagada — võta üks saade ja tee see ära.
      Keskmine arvutatakse kohe ise.
    </p>
    <p class="note">
      Skaala on 1–10, ainult täisnumbrid. Kes saates ei osalenud või kelle
      hinne jäi kuulmata, jäta tühjaks — keskmine arvestab ainult täidetud
      lahtreid. Enter viib järgmisse lahtrisse.
    </p>

    <div class="edu">
      <div class="edu__rada"><span class="edu__joon" id="edenemine"></span></div>
      <p class="edu__silt mono">
        <b><span id="n-tehtud">0</span></b> / <span id="n-kokku">0</span> lugu hinnatud
      </p>
    </div>
    <p class="teade" id="teade" hidden></p>
  </header>

  <div id="saated"></div>

  <section class="howto" id="jsonplokk" hidden>
    <div class="shead__top">
      <h2>Sisestatud hinded</h2>
      <button class="btn" id="kopeeri">kopeeri</button>
    </div>
    <p class="note">
      Kui salvestamine ei õnnestu, ei ole töö kadunud — kopeeri see plokk ja
      saada lehe omanikule. Sealt läheb ta käsuga
      <code>npm run critics:apply</code> otse andmefaili.
    </p>
    <pre><code id="json"></code></pre>
  </section>

  <div class="riba" id="riba" hidden>
    <span id="riba__n"></span>
    <button class="btn btn--primary" id="salvesta">Salvesta lehele</button>
  </div>`;

/* Palett on sama mis ülevaatuslehel ja saidil endal — need kolm on üks pere. */
const CSS = `
:root {
  --ground: #f5f3ef;
  --card: #fffefb;
  --ink: #14120f;
  --muted: #6c665c;
  --line: #ddd8cf;
  --line-soft: #e9e5dd;
  --field: #fbf9f5;

  --ok: #5f8a5a;
  --wait: #8fa38a;
  --accent: #a1256b;

  --shadow: 0 1px 2px rgba(20, 18, 15, 0.05);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --ground: #14120f; --card: #1d1a16; --ink: #efece5; --muted: #a09889;
    --line: #35302a; --line-soft: #272320; --field: #14120f;
    --ok: #8bb585; --wait: #a3b79e; --accent: #e08cba;
    --shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  }
}
:root[data-theme="dark"] {
  --ground: #14120f; --card: #1d1a16; --ink: #efece5; --muted: #a09889;
  --line: #35302a; --line-soft: #272320; --field: #14120f;
  --ok: #8bb585; --wait: #a3b79e; --accent: #e08cba;
  --shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--ground);
  color: var(--ink);
  font-family: Archivo, 'Helvetica Neue', Arial, sans-serif;
  font-size: 15px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

#kest {
  max-width: 1040px;
  margin: 0 auto;
  padding: 56px 24px 140px;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

code, .eyebrow, .mono, .saade__nr, .veerg, .kesk, .btn, .hinne, .saade__seis {
  font-family: 'Space Mono', ui-monospace, Menlo, monospace;
}

.masthead { display: flex; flex-direction: column; gap: 14px; }
.eyebrow {
  font-size: 11px; letter-spacing: 1.6px; text-transform: uppercase;
  color: var(--muted); margin: 0;
}
h1 {
  font-size: clamp(30px, 5vw, 42px); font-weight: 800;
  letter-spacing: -0.02em; line-height: 1.1; margin: 0; text-wrap: balance;
}
.lede { margin: 0; max-width: 64ch; color: var(--muted); }
.lede b { color: var(--ink); }
.note { margin: 0; color: var(--muted); font-size: 13px; max-width: 64ch; }

.teade {
  margin: 4px 0 0; padding: 10px 14px; border-radius: 3px;
  background: var(--card); border: 1px solid var(--accent);
  color: var(--ink); font-size: 14px;
}

/* Edenemisriba: 376 lugu on pikk tee, seega peab näha olema, kui palju on tehtud. */
.edu { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; }
.edu__rada {
  height: 8px; background: var(--line); border-radius: 4px; overflow: hidden;
}
.edu__joon { display: block; height: 100%; width: 0; background: var(--ok); transition: width 0.2s; }
.edu__silt { margin: 0; font-size: 12px; color: var(--muted); }
.edu__silt b { color: var(--ink); font-size: 15px; }

/* ── Saade ──────────────────────────────────────────────────────── */

#saated { display: flex; flex-direction: column; gap: 8px; }

.saade {
  background: var(--card); border: 1px solid var(--line);
  border-radius: 3px; box-shadow: var(--shadow); overflow: hidden;
}
.saade--pooleli { border-left: 4px solid var(--wait); }
.saade--valmis { border-left: 4px solid var(--ok); }

.saade__pea {
  width: 100%; display: grid;
  grid-template-columns: 44px 1fr auto 20px;
  align-items: center; gap: 14px;
  padding: 12px 16px; border: 0; background: none;
  color: inherit; font: inherit; text-align: left; cursor: pointer;
}
.saade__pea:hover { background: var(--field); }
.saade__nr { font-size: 13px; color: var(--muted); }
.saade__info { min-width: 0; }
.saade__info b {
  display: block; font-weight: 600; font-size: 15px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.saade__meta { display: block; font-size: 12px; color: var(--muted); }
.saade__seis { font-size: 11px; color: var(--muted); white-space: nowrap; }
.saade--valmis .saade__seis { color: var(--ok); }
.saade__nool { color: var(--muted); transition: transform 0.15s; }
.saade__pea[aria-expanded="true"] .saade__nool { transform: rotate(180deg); }

.saade__sisu { border-top: 1px solid var(--line-soft); padding: 4px 16px 14px; }

/* ── Hindetabel ─────────────────────────────────────────────────── */

.tabel { display: flex; flex-direction: column; }

.rida {
  display: grid;
  grid-template-columns: minmax(0, 1fr) repeat(var(--veerge, 5), 62px) 84px;
  align-items: center; gap: 8px;
  padding: 8px 0; border-bottom: 1px solid var(--line-soft);
}
.rida--pea {
  border-bottom: 1px solid var(--line);
  font-size: 10px; letter-spacing: 0.6px; text-transform: uppercase;
  color: var(--muted); padding-bottom: 6px;
}
.rida:last-child { border-bottom: 0; }

.lugu { min-width: 0; }
.lugu b { display: block; font-weight: 500; overflow-wrap: anywhere; }
.lugu__esitaja { display: block; font-size: 12px; color: var(--muted); overflow-wrap: anywhere; }

.veerg { text-align: center; }
.veerg--kesk { text-align: right; }

.hinne {
  width: 100%; padding: 7px 4px; text-align: center;
  font-size: 15px; background: var(--field); color: var(--ink);
  border: 1px solid var(--line); border-radius: 2px;
  -moz-appearance: textfield;
}
.hinne::-webkit-outer-spin-button, .hinne::-webkit-inner-spin-button {
  -webkit-appearance: none; margin: 0;
}
.hinne:focus { border-color: var(--accent); outline: none; box-shadow: 0 0 0 2px rgba(161, 37, 107, 0.16); }
.hinne.vigane { border-color: var(--accent); background: rgba(161, 37, 107, 0.08); }

.kesk { font-size: 12px; color: var(--muted); }
.kesk b { font-size: 17px; color: var(--accent); margin-right: 5px; }
.kesk .tyhi { color: var(--line); font-size: 17px; }
.kesk__n { font-size: 11px; }

/* ── Muu ────────────────────────────────────────────────────────── */

.btn {
  font-size: 11px; letter-spacing: 0.6px; padding: 8px 13px;
  background: transparent; color: var(--muted);
  border: 1px solid var(--line); border-radius: 2px; cursor: pointer;
}
.btn:hover { color: var(--ink); border-color: var(--muted); }
.btn--primary {
  background: var(--accent); color: var(--ground);
  border-color: var(--accent); font-weight: 700;
}
.btn--primary:hover { color: var(--ground); opacity: 0.88; }
.btn[disabled] { opacity: 0.5; cursor: default; }

.shead__top { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.howto {
  background: var(--card); border: 1px solid var(--line);
  border-radius: 3px; padding: 20px 22px;
  display: flex; flex-direction: column; gap: 12px;
}
h2 { font-size: 18px; font-weight: 700; margin: 0; }
pre {
  margin: 0; padding: 14px 16px; overflow-x: auto; max-height: 340px;
  background: var(--ground); border: 1px solid var(--line-soft);
  border-radius: 3px; font-size: 12px; line-height: 1.5;
}

/* Salvestusriba jääb ekraani alla — pikas nimekirjas ei tohi teda otsima pidada. */
.riba {
  position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%);
  display: flex; align-items: center; gap: 14px;
  padding: 10px 14px; border-radius: 3px;
  background: var(--card); border: 1px solid var(--line);
  box-shadow: 0 6px 20px rgba(20, 18, 15, 0.18);
  font-family: 'Space Mono', monospace; font-size: 12px;
  z-index: 10;
}

button:focus-visible, .hinne:focus-visible {
  outline: 2px solid var(--accent); outline-offset: 2px;
}

/* Kitsal ekraanil ei mahu viis veergu kõrvuti. Lugu läheb omaette reale ja
   lahtrid tema alla — nii jääb sisestamine võimalikuks ka telefonis. */
@media (max-width: 720px) {
  #kest { padding: 40px 14px 130px; }
  .rida {
    grid-template-columns: repeat(auto-fit, minmax(52px, 1fr));
    gap: 6px; padding: 12px 0;
  }
  .lugu { grid-column: 1 / -1; }
  .rida--pea { display: none; }
  .veerg { position: relative; padding-top: 15px; }
  .veerg::before {
    content: attr(data-silt);
    position: absolute; top: 0; left: 0; right: 0;
    font-size: 9px; letter-spacing: 0.4px; color: var(--muted);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .veerg--kesk { text-align: center; grid-column: 1 / -1; padding-top: 8px; }
  .saade__pea { grid-template-columns: 34px 1fr 20px; gap: 10px; }
  .saade__seis { grid-column: 2; font-size: 10px; }
}
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
`;

/* Otsevõrdlus argv[1] vastu ei kõlba: import.meta.url on protsentkodeeritud
   ("rahvan%C3%B5unikud"), argv[1] mitte. pathToFileURL teeb mõlemast sama kuju. */
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildSheet().catch((err) => {
    console.error(`critic-sheet ebaõnnestus: ${err.message}`);
    process.exit(1);
  });
}
