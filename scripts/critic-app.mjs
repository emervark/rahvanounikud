// Kriitikute hindelehe kliendipool. Läheb lehe sisse <script id="app"> plokki
// ja peab seetõttu olema tavaline skript, mitte moodul.
//
// Erinevus ülevaatuslehest: seal tehti üksikuid otsuseid ja iga muutuse peale
// võis kogu nimekirja uuesti joonistada. Siin täidetakse ~1500 lahtrit järjest,
// klaviatuurilt, saadet kuulates. Ümberjoonistamine kaotaks fookuse ja kirjutaks
// poolelioleva lahtri üle. Seepärast muudab sisestus ainult mudelit, rea
// keskmist ja loendureid — ridu ennast ei puututa.

export const APP = String.raw`
const andmed = JSON.parse(document.getElementById('andmed').textContent);
let hinded = JSON.parse(document.getElementById('hinded').textContent);

/* Salvestamata sisestus peab üle elama lehe ümberlaadimise.

   Artefakti avaldamine laeb KÕIK lahtised vaated uuesti — ka selle, kus
   parajasti keegi kirjutab. Kui keegi teine salvestab samal ajal, kui sina
   oled poole saate hinded sisestanud, kaoks see jäljetult. Seepärast peegeldub
   iga lahter kohe sessionStorage'i ja loetakse laadimisel tagasi. */
const OOTEL_VOTI = 'rn-hinded-ootel';

function loeOotel() {
  try { return JSON.parse(sessionStorage.getItem(OOTEL_VOTI) || '{}'); }
  catch { return {}; }
}
function salvestaOotel() {
  try { sessionStorage.setItem(OOTEL_VOTI, JSON.stringify(ootel)); }
  catch { /* privaatrežiim või täis mälu — siis lihtsalt ei peegeldu */ }
}

let ootel = loeOotel();

/* Juba salvestatuks saanu ei ole enam ootel. Nii tühjeneb hulk ise pärast
   õnnestunud avaldamist ja alles jäävad ainult päriselt salvestamata lahtrid. */
let taastatuid = 0;
for (const id of Object.keys(ootel)) {
  for (const nimi of Object.keys(ootel[id])) {
    if ((hinded[id] || {})[nimi] === ootel[id][nimi]) delete ootel[id][nimi];
  }
  if (Object.keys(ootel[id]).length === 0) delete ootel[id];
  else taastatuid += Object.keys(ootel[id]).length;
}
salvestaOotel();

let kirjutamine = 'teadmata';   // teadmata | jah | ei

const $ = (s, r) => (r || document).querySelector(s);
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ── Mudel ───────────────────────────────────────────────────────── */

/** Ootel olev väärtus võidab salvestatu; null ootel tähendab kustutatud. */
function väärtus(id, nimi) {
  const o = ootel[id];
  if (o && nimi in o) return o[nimi];
  const h = hinded[id];
  return h && nimi in h ? h[nimi] : null;
}

/** Ühe loo kõik antud hinded, tühjad välja jäetud. */
function reaHinded(lugu) {
  const välja = [];
  for (const nimi of lugu.kriitikud) {
    const v = väärtus(lugu.id, nimi);
    if (typeof v === 'number') välja.push(v);
  }
  return välja;
}

/** Keskmine ühest kohast pärast koma, eesti komaga. */
function keskmine(arvud) {
  if (arvud.length === 0) return null;
  const summa = arvud.reduce((a, b) => a + b, 0);
  return summa / arvud.length;
}
const vorm = (n) => n.toFixed(1).replace('.', ',');

function pane(id, nimi, v) {
  const salvestatud = (hinded[id] || {})[nimi];
  const sama = (salvestatud === undefined && v === null) || salvestatud === v;
  if (sama) {
    if (ootel[id]) { delete ootel[id][nimi]; if (!Object.keys(ootel[id]).length) delete ootel[id]; }
  } else {
    if (!ootel[id]) ootel[id] = {};
    ootel[id][nimi] = v;
  }
  salvestaOotel();
}

function muudatusi() {
  let n = 0;
  for (const id of Object.keys(ootel)) n += Object.keys(ootel[id]).length;
  return n;
}

/* Lugu loeb hinnatuks, kui vähemalt üks kriitik on hinde andnud. Nii näitab
   edenemine tehtud tööd ka siis, kui mõni kriitik saates ei osalenud või tema
   hinne jäi kuulmata. */
function looTehtud(lugu) { return reaHinded(lugu).length > 0; }
function saateTehtud(saade) { return saade.lood.filter(looTehtud).length; }

/* ── Joonistamine ────────────────────────────────────────────────── */

function loendurid() {
  let tehtud = 0, kokku = 0;
  for (const s of andmed.saated) { kokku += s.lood.length; tehtud += saateTehtud(s); }
  $('#n-tehtud').textContent = tehtud;
  $('#n-kokku').textContent = kokku;
  $('#edenemine').style.width = (kokku ? (tehtud / kokku) * 100 : 0) + '%';

  const m = muudatusi();
  const riba = $('#riba');
  riba.hidden = m === 0;
  $('#riba__n').textContent = m === 1 ? '1 salvestamata hinne' : m + ' salvestamata hinnet';
  if (kirjutamine === 'ei') {
    $('#salvesta').setAttribute('disabled', '');
    $('#salvesta').textContent = 'kirjutusõiguseta';
  }
}

function saateSilt(saade) {
  const tehtud = saateTehtud(saade);
  const kõik = saade.lood.length;
  if (tehtud === 0) return kõik + ' lugu · tegemata';
  if (tehtud === kõik) return kõik + ' lugu · valmis';
  return tehtud + '/' + kõik + ' lugu';
}

function uuendaPäis(saade) {
  const el = document.querySelector('.saade[data-nr="' + saade.nr + '"]');
  if (!el) return;
  const tehtud = saateTehtud(saade);
  el.querySelector('.saade__seis').textContent = saateSilt(saade);
  el.classList.toggle('saade--valmis', tehtud === saade.lood.length);
  el.classList.toggle('saade--pooleli', tehtud > 0 && tehtud < saade.lood.length);
}

function tabel(saade) {
  /* Veergude arv käib CSS-i muutujaga, sest külalisega saates on neid viis ja
     ilma külaliseta neli — ruudustik peab mõlemal juhul kokku minema. */
  let h = '<div class="tabel" role="table" style="--veerge: ' + saade.kriitikud.length + '">';
  h += '<div class="rida rida--pea" role="row"><span role="columnheader">Lugu</span>';
  for (const nimi of saade.kriitikud) {
    h += '<span class="veerg" role="columnheader" title="' + esc(nimi) + '">'
      + esc(lühike(nimi)) + '</span>';
  }
  h += '<span class="veerg veerg--kesk" role="columnheader">Keskmine</span></div>';

  for (const lugu of saade.lood) {
    h += '<div class="rida" role="row" data-lugu="' + esc(lugu.id) + '">';
    h += '<span class="lugu" role="cell"><b>' + esc(lugu.pealkiri) + '</b>'
      + '<span class="lugu__esitaja">' + esc(lugu.esitaja) + '</span></span>';
    for (const nimi of lugu.kriitikud) {
      const v = väärtus(lugu.id, nimi);
      /* data-silt kannab nime ka mobiilis, kus päiserida on peidus — muidu ei
         teaks keegi, kelle hinnet ta parajasti kirjutab. */
      h += '<span class="veerg" role="cell" data-silt="' + esc(lühike(nimi)) + '">'
        + '<input class="hinne" type="number" min="1" max="10"'
        + ' step="0.5" inputmode="decimal" aria-label="' + esc(nimi + ': ' + lugu.pealkiri) + '"'
        + ' data-lugu="' + esc(lugu.id) + '" data-nimi="' + esc(nimi) + '"'
        + ' value="' + (typeof v === 'number' ? v : '') + '"></span>';
    }
    h += '<span class="veerg veerg--kesk kesk" role="cell" data-silt="Keskmine">'
      + keskmiseTekst(lugu) + '</span>';
    h += '</div>';
  }
  return h + '</div>';
}

function keskmiseTekst(lugu) {
  const arvud = reaHinded(lugu);
  if (arvud.length === 0) return '<span class="tyhi">—</span>';
  return '<b>' + vorm(keskmine(arvud)) + '</b><span class="kesk__n">'
    + arvud.length + '/' + lugu.kriitikud.length + '</span>';
}

/** Eesnimi + perenime esitäht — veerg peab mahtuma, aga nimi jääma äratuntavaks. */
function lühike(nimi) {
  const osad = nimi.split(' ');
  if (osad.length < 2) return nimi;
  return osad[0] + ' ' + osad[1][0] + '.';
}

function joonista() {
  let h = '';
  for (const saade of andmed.saated) {
    h += '<section class="saade" data-nr="' + saade.nr + '">'
      + '<button class="saade__pea" type="button" data-ava="' + saade.nr + '" aria-expanded="false">'
      + '<span class="saade__nr">' + saade.nr + '</span>'
      + '<span class="saade__info"><b>' + esc(saade.pealkiri) + '</b>'
      + '<span class="saade__meta">' + esc(saade.kuupäev)
      + (saade.külalised ? ' · külaline: ' + esc(saade.külalised) : '') + '</span></span>'
      + '<span class="saade__seis">' + saateSilt(saade) + '</span>'
      + '<span class="saade__nool">▾</span>'
      + '</button>'
      + '<div class="saade__sisu" hidden></div>'
      + '</section>';
  }
  $('#saated').innerHTML = h;
  for (const saade of andmed.saated) uuendaPäis(saade);
  loendurid();
}

/* ── Sündmused ───────────────────────────────────────────────────── */

const saadeNr = (nr) => andmed.saated.find((s) => String(s.nr) === String(nr));

document.addEventListener('click', (e) => {
  const pea = e.target.closest('[data-ava]');
  if (pea) {
    const sisu = pea.parentElement.querySelector('.saade__sisu');
    const lahti = !sisu.hidden;
    if (lahti) { sisu.hidden = true; pea.setAttribute('aria-expanded', 'false'); return; }
    /* Sisu ehitatakse alles avamisel. 91 saadet korraga tähendaks ligi
       1500 sisendvälja, mis teeb lehe laadimise märgatavalt aeglaseks. */
    if (!sisu.dataset.tehtud) {
      sisu.innerHTML = tabel(saadeNr(pea.dataset.ava));
      sisu.dataset.tehtud = '1';
    }
    sisu.hidden = false;
    pea.setAttribute('aria-expanded', 'true');
    return;
  }
  const n = e.target.closest('#salvesta');
  if (n) salvesta();
  const k = e.target.closest('#kopeeri');
  if (k) kopeeri();
});

document.addEventListener('input', (e) => {
  const el = e.target.closest('.hinne');
  if (!el) return;
  const tekst = el.value.trim();
  let v = null;
  if (tekst !== '') {
    const n = Number(tekst.replace(',', '.'));
    if (!Number.isFinite(n) || n < 1 || n > 10) { el.classList.add('vigane'); return; }
    v = n;
  }
  el.classList.remove('vigane');
  pane(el.dataset.lugu, el.dataset.nimi, v);

  /* Ainult see rida ja loendurid — mitte ümberjoonistamine, muidu kaob fookus
     keset sisestamist. */
  const rida = el.closest('.rida');
  const saade = andmed.saated.find((s) => s.lood.some((l) => l.id === el.dataset.lugu));
  const lugu = saade.lood.find((l) => l.id === el.dataset.lugu);
  rida.querySelector('.kesk').innerHTML = keskmiseTekst(lugu);
  uuendaPäis(saade);
  loendurid();
});

/* Enter viib järgmisse lahtrisse. Sisestus käib saadet kuulates, käsi ei jõua
   hiirele — ja number-tüüpi väljal ei tee Enter muidu midagi. */
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const el = e.target.closest('.hinne');
  if (!el) return;
  e.preventDefault();
  const kõik = [...document.querySelectorAll('.hinne')];
  const j = kõik.indexOf(el);
  if (j >= 0 && j + 1 < kõik.length) kõik[j + 1].focus();
});

/* ── Salvestamine ────────────────────────────────────────────────── */

function liidetud() {
  const välja = {};
  for (const id of Object.keys(hinded)) välja[id] = Object.assign({}, hinded[id]);
  for (const id of Object.keys(ootel)) {
    välja[id] = Object.assign({}, välja[id] || {});
    for (const nimi of Object.keys(ootel[id])) {
      if (ootel[id][nimi] === null) delete välja[id][nimi];
      else välja[id][nimi] = ootel[id][nimi];
    }
    if (Object.keys(välja[id]).length === 0) delete välja[id];
  }
  return välja;
}

/* Uus dokument ehitatakse allikast — andmed, CSS ja app on lehel olemas —,
   mitte elavat DOM-i seerialiseerides. Muidu salvestuks sisse ka avatud
   saated, fookus ja poolelioleva salvestamise olek. */
function dokument(uuedHinded) {
  const css = document.getElementById('css').textContent;
  const app = document.getElementById('app').textContent;
  const koopia = document.getElementById('kest').cloneNode(true);

  koopia.querySelector('#saated').innerHTML = '';
  const riba = koopia.querySelector('#riba');
  if (riba) {
    riba.setAttribute('hidden', '');
    const n = riba.querySelector('#salvesta');
    n.removeAttribute('disabled');
    n.textContent = 'Salvesta lehele';
  }
  const plokk = koopia.querySelector('#jsonplokk');
  if (plokk) { plokk.setAttribute('hidden', ''); plokk.querySelector('#json').textContent = ''; }
  const teade = koopia.querySelector('#teade');
  if (teade) { teade.setAttribute('hidden', ''); teade.textContent = ''; }

  const kest = koopia.innerHTML;
  const j = (o) => JSON.stringify(o).replace(/</g, '\\u003c');
  return '<!doctype html>\n<html lang="et">\n<head>\n<meta charset="utf-8">\n'
    + '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    + '<title>Nõunike hinded</title>\n'
    + '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    + '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    + '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;800&family=Space+Mono:wght@400;700&display=swap">\n'
    + '<style id="css">' + css + '</style>\n</head>\n<body>\n'
    + '<div id="kest">' + kest + '</div>\n'
    + '<script type="application/json" id="andmed">' + j(andmed) + '<\/script>\n'
    + '<script type="application/json" id="hinded">' + j(uuedHinded) + '<\/script>\n'
    + '<script id="app">' + app + '<\/script>\n</body>\n</html>';
}

async function salvesta() {
  const nupp = $('#salvesta');
  if (!nupp || nupp.disabled) return;
  nupp.disabled = true;
  nupp.textContent = 'salvestan…';

  try {
    const a = await window.claude.use('artifact');
    if (!a) throw { code: 'not_granted' };
    await a.publish(dokument(liidetud()));
    /* Õnnestumisel laeb vaade ise uue versiooni peale. */
  } catch (e) {
    const kood = (e && e.code) || 'upstream_error';
    nupp.disabled = false;
    nupp.textContent = 'Salvesta lehele';
    if (kood === 'conflict') {
      teade('Keegi jõudis enne — leht laeb uue versiooni. Sinu viimased hinded läksid kaotsi, sisesta uuesti.');
    } else if (kood === 'not_granted' || kood === 'not_writer' || kood === 'not_declared'
               || kood === 'capability_disabled' || kood === 'capability_removed') {
      kirjutamine = 'ei';
      näitaJson();
      teade('Sellel vaatel ei ole kirjutusõigust. Hinded on alles — kopeeri need allpool oleva nupuga ja saada omanikule.');
      loendurid();
    } else if (kood === 'rate_limited') {
      teade('Liiga tihe salvestamine. Oota hetk ja proovi uuesti.');
    } else if (kood === 'too_large') {
      teade('Leht on salvestamiseks liiga suur.');
    } else {
      teade('Salvestamine ei õnnestunud (' + kood + '). Hinded on alles.');
    }
  }
}

function näitaJson() {
  $('#json').textContent = JSON.stringify(liidetud(), null, 2);
  $('#jsonplokk').hidden = false;
}

function kopeeri() {
  const t = $('#json').textContent;
  navigator.clipboard.writeText(t).then(
    () => { $('#kopeeri').textContent = 'kopeeritud'; },
    () => { $('#kopeeri').textContent = 'ei õnnestunud — vali käsitsi'; },
  );
}

function teade(t) {
  const el = $('#teade');
  if (!el) return;
  el.textContent = t;
  el.hidden = false;
}

/* ── Käivitus ────────────────────────────────────────────────────── */

joonista();

if (taastatuid > 0) {
  teade(taastatuid === 1
    ? '1 salvestamata hinne taastati. Vajuta Salvesta.'
    : taastatuid + ' salvestamata hinnet taastati. Vajuta Salvesta.');
}

/* Kirjutusõiguse kontroll käib vaikselt: kui seda ei ole, ütleme seda kohe,
   mitte alles siis, kui keegi on terve saate hinded ära sisestanud. */
window.claude.use('artifact').then(
  (a) => { kirjutamine = a ? 'jah' : 'ei'; if (!a) { näitaJson(); teade('Sellel vaatel ei ole kirjutusõigust — sisestatud hinded saad allpool kopeerida.'); } loendurid(); },
  () => { kirjutamine = 'ei'; loendurid(); },
);
`;
