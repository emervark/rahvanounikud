// Ülevaatuslehe kliendipool, eraldi failis lihtsalt sellepärast, et teda on
// pikk. review-page.mjs paneb ta lehele <script id="app"> sisse.
//
// Leht renderdab end kahest JSON-plokist: `andmed` (muutumatu nimekiri) ja
// `otsused` (mida inimene on kinnitanud). Salvestamine tähendab, et leht
// ehitab endast uue täisdokumendi ja avaldab selle artifact-võimekuse kaudu.
// Seepärast ei tohi salvestamisel elavat DOM-i seerialiseerida — võtame CSS-i
// ja selle skripti teksti otse nende elementide sisust, mis on lehe algne
// lähtekood, ja paneme uue dokumendi kokku sellest.

export const APP = String.raw`
const andmed = JSON.parse(document.getElementById('andmed').textContent);
let otsused = JSON.parse(document.getElementById('otsused').textContent);

/* Ootel muudatused ootavad Salvesta-nuppu — iga klahvivajutuse peale
   avaldamine mindaks kiiresti kvoodi vastu ja iga avaldamine on uus versioon.
   Aga nad ei tohi elada ainult mälus.

   Kui keegi teine sama artefakti uuesti avaldab, laeb see kõik lahtised
   vaated ümber — ka selle, kus parajasti keegi kirjutab. Mälus olev sisestus
   kaob siis jäljetult ja inimene ei saa isegi teada, et ta töö kadus. Sama
   kehtib lehe värskendamise ja brauseri sulgemise kohta.

   Seepärast peegeldame ootel muudatused sessionStorage'i ja loeme nad
   laadimisel tagasi. */
const OOTEL_VOTI = 'rn-ootel';

function loeOotel() {
  try {
    return JSON.parse(sessionStorage.getItem(OOTEL_VOTI) || '{}');
  } catch {
    return {};
  }
}

function salvestaOotel() {
  try {
    sessionStorage.setItem(OOTEL_VOTI, JSON.stringify(ootel));
  } catch { /* privaatrežiim või täis mälu — siis lihtsalt ei peegeldu */ }
}

let ootel = loeOotel();

/* Salvestatuks saanud muudatused ei ole enam ootel. Nii tühjeneb hulk ise
   pärast õnnestunud avaldamist (mis vaate samuti ümber laeb) ja alles jäävad
   ainult need, mis päriselt salvestamata on. */
for (const id of Object.keys(ootel)) {
  if (JSON.stringify(otsused[id] ?? null) === JSON.stringify(ootel[id] ?? null)) {
    delete ootel[id];
  }
}
salvestaOotel();
let kirjutamine = 'teadmata';   // teadmata | jah | ei

/* Tehtud lood lähevad korvist peitu — muidu kasvab nimekiri töö käigus
   ainult tihedamaks ja juba lahendatu segab veel lahendamata vahelt otsimist.
   Peidus, mitte kustutatud: kinnitust peab saama tagasi võtta, seega saab
   need loenduri juurest korraks nähtavale tõmmata. */
const naitaTehtuid = {};

const $ = (s, r) => (r || document).querySelector(s);
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Kleebitud lingist tuleb välja noppida ID. Inimene kleebib mida iganes:
   täispika aadressi, youtu.be lühivormi, shorts-lingi, spotify: URI või
   lihtsalt ID. Kõik need tähendavad sama asja. */
function loeLink(tekst) {
  const t = (tekst || '').trim();
  if (!t) return null;
  let m;
  if ((m = t.match(/[?&]v=([\w-]{11})/))) return { liik: 'yt', id: m[1] };
  if ((m = t.match(/youtu\.be\/([\w-]{11})/))) return { liik: 'yt', id: m[1] };
  if ((m = t.match(/\/(?:shorts|embed|live)\/([\w-]{11})/))) return { liik: 'yt', id: m[1] };
  if ((m = t.match(/track[\/:]([A-Za-z0-9]{22})/))) return { liik: 'sp', id: m[1] };

  /* SoundCloud: permalink kõlbab otse, numbrilist ID-d ei ole vaja. */
  if ((m = t.match(/https?:\/\/(?:www\.|m\.)?soundcloud\.com\/[\w-]+\/[\w-]+/))) {
    return { liik: 'sc', url: m[0].split('?')[0] };
  }

  /* Bandcamp: mängija tahab numbrilisi ID-sid, mida permalink ei sisalda.
     Seepärast ootame embed-koodi — seal on album= ja track= sees. Paljas
     permalink läheb tagasi omaette teatega, muidu jääks inimene arvama, et
     link oli vigane. */
  if (/bandcamp\.com/.test(t)) {
    const album = t.match(/album=(\d+)/);
    if (!album) return { liik: 'bc-puudulik' };
    const track = t.match(/track=(\d+)/);
    const link = t.match(/https?:\/\/[\w.-]*bandcamp\.com\/(?:album|track)\/[\w-]+/);
    return {
      liik: 'bc',
      bc: {
        album: album[1],
        ...(track ? { track: track[1] } : {}),
        url: link ? link[0] : t,
      },
    };
  }

  if (/^[\w-]{11}$/.test(t)) return { liik: 'yt', id: t };
  if (/^[A-Za-z0-9]{22}$/.test(t)) return { liik: 'sp', id: t };
  return null;
}

const otsus = (id) => ootel[id] !== undefined ? ootel[id] : otsused[id];
const muudatusi = () => Object.keys(ootel).length;

function pane(id, v) {
  const salvestatud = otsused[id] || null;
  const uus = v || null;
  /* null tähendab „võtame kinnituse tagasi". Kui salvestatut ei olegi, siis
     ei ole see muudatus vaid tühistamine — ootel-hulgast välja. */
  if (JSON.stringify(salvestatud) === JSON.stringify(uus)) delete ootel[id];
  else ootel[id] = uus;
  salvestaOotel();
  joonista();
}

/* ── Ülakiht: mida iga lugu praegu vajab ─────────────────────────── */

function seis(kirje) {
  const o = otsus(kirje.id);
  if (!o) return null;
  if (o.laad === 'vale') return { silt: 'märgitud valeks', toon: 'gap' };
  if (o.laad === 'ok') return { silt: 'kinnitatud õigeks', toon: 'ok' };
  return { silt: 'uus link', toon: 'ok' };
}

function nupurida(kirje) {
  const o = otsus(kirje.id);
  const on = (l) => (o && o.laad === l) ? ' on' : '';
  const väärtus = o && o.laad === 'link' ? (o.yt || o.sp || o.sc || (o.bc ? o.bc.url : '') || '') : '';
  return '<div class="fix">'
    + '<input class="fix__in" type="text" spellcheck="false" data-id="' + esc(kirje.id) + '"'
    + ' placeholder="YouTube, Spotify, SoundCloud või Bandcampi embed-kood" value="' + esc(väärtus) + '">'
    + (kirje.saabKinnitada
        ? '<button class="btn' + on('ok') + '" data-teha="ok" data-id="' + esc(kirje.id) + '">õige</button>'
        : '')
    + '<button class="btn' + on('vale') + '" data-teha="vale" data-id="' + esc(kirje.id) + '">'
    + (kirje.saabKinnitada ? 'vale' : 'pole olemas') + '</button>'
    + (o ? '<button class="btn btn--x" data-teha="tyhista" data-id="' + esc(kirje.id) + '">×</button>' : '')
    + '</div>';
}

function meeter(v, toon) {
  const p = Math.round((v || 0) * 100);
  return '<span class="meter" role="img" aria-label="kindlus ' + p + '%">'
    + '<span class="meter__fill meter__fill--' + toon + '" style="width:' + p + '%"></span></span>'
    + '<span class="conf">' + (v || 0).toFixed(2).replace('.', ',') + '</span>';
}

const nimi = (k) => esc(k.esitaja) + ' <span class="dash">—</span> ' + esc(k.pealkiri);
const kust = (k) => 'saade ' + k.nr + ' · ' + k.kuupäev;

function kaart(k) {
  const s = seis(k);
  return '<article class="card' + (s ? ' card--done' : '') + '">'
    + '<header class="card__head"><h3 class="card__title">' + nimi(k) + '</h3>'
    + (s ? '<span class="chip chip--' + s.toon + '">' + s.silt + '</span>' : '')
    + '<p class="card__meta">' + kust(k) + ' · <code>' + esc(k.id) + '</code></p></header>'
    + '<div class="cmp">' + k.lingid.map((l) =>
        '<div class="cmp__row"><span class="src src--' + l.liik + '">' + (l.liik === 'sp' ? 'Spotify' : 'YouTube') + '</span>'
        + '<span class="cmp__got">' + esc(l.vaste) + '</span>'
        + meeter(l.kindlus, 'warn')
        + '<a class="go" href="' + esc(l.url) + '" target="_blank" rel="noreferrer">ava&nbsp;↗</a></div>').join('')
    + '</div>'
    + nupurida(k)
    + '<footer class="card__foot"><a href="' + esc(k.ytOtsi) + '" target="_blank" rel="noreferrer">otsi YouTube\'ist</a>'
    + '<a href="' + esc(k.spOtsi) + '" target="_blank" rel="noreferrer">otsi Spotifyst</a></footer></article>';
}

function rida(k, näitaPakkumist) {
  const s = seis(k);
  return '<li class="row' + (s ? ' row--done' : '') + '">'
    + '<div class="row__main"><p class="row__name">' + nimi(k)
    + (s ? ' <span class="chip chip--' + s.toon + '">' + s.silt + '</span>' : '') + '</p>'
    + (näitaPakkumist && k.pakkumine ? '<p class="row__guess">pakub: ' + esc(k.pakkumine) + '</p>' : '')
    + '</div><div class="row__side">'
    + (näitaPakkumist ? meeter(k.kindlus, 'guess') : '')
    + (k.pakkumineUrl ? '<a class="go" href="' + esc(k.pakkumineUrl) + '" target="_blank" rel="noreferrer">vaata&nbsp;↗</a>' : '')
    + '<a class="go" href="' + esc(k.ytOtsi) + '" target="_blank" rel="noreferrer">otsi&nbsp;↗</a>'
    + '</div><p class="row__id"><code>' + esc(k.id) + '</code> · ' + kust(k) + '</p>'
    + '<div class="row__fix">' + nupurida(k) + '</div></li>';
}

/* ── Overrides-plokk kopeerimiseks ───────────────────────────────── */

function overrides() {
  const kõik = Object.assign({}, otsused, ootel);
  const välja = {};
  for (const id of Object.keys(kõik)) {
    const o = kõik[id];
    if (!o) continue;
    const rida = { _note: o.märkus || 'käsitsi üle vaadatud' };
    if (o.laad === 'vale') {
      /* Kui kumbagi linki polnudki, tuleb null panna mõlemale: muidu leiaks
         järgmine resolveri käik selle loo uuesti üles ja „pole olemas" ei
         peaks kaua vastu. */
      if (o.mis === 'sp') rida.spotifyId = null;
      else if (o.mis === 'yt') rida.youtubeId = null;
      else { rida.spotifyId = null; rida.youtubeId = null; }
    } else {
      if (o.yt) rida.youtubeId = o.yt;
      if (o.sp) rida.spotifyId = o.sp;
      if (o.sc) rida.soundcloudUrl = o.sc;
      if (o.bc) rida.bandcamp = o.bc;
    }
    välja[id] = rida;
  }
  return JSON.stringify(välja, null, 2);
}

/* ── Enda uuesti avaldamine ──────────────────────────────────────── */

function dokument(uuedOtsused) {
  const css = document.getElementById('css').textContent;
  const app = document.getElementById('app').textContent;
  /* Kesta võtame koopiana ja tühjendame nimekirjad: renderdatud read on
     olek, mitte lähtekood, ja nad joonistatakse laadimisel andmetest uuesti. */
  const koopia = document.getElementById('kest').cloneNode(true);
  koopia.querySelectorAll('[data-list]').forEach((el) => { el.innerHTML = ''; });
  /* Sama kehtib riba ja teate kohta: kui nad lähevad kaasa selles seisus,
     milles nad salvestamise hetkel olid, näeb järgmine avaja korraks
     „20 muudatust / salvestan..." enne kui joonista() selle ära parandab. */
  const riba = koopia.querySelector('#riba');
  if (riba) {
    riba.setAttribute('hidden', '');
    riba.querySelector('#riba__n').textContent = '';
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
    + '<title>Puuduvad ja kahtlased lingid</title>\n'
    + '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    + '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    + '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;800&family=Space+Mono:wght@400;700&display=swap">\n'
    + '<style id="css">' + css + '</style>\n</head>\n<body>\n'
    + '<div id="kest">' + kest + '</div>\n'
    + '<script type="application/json" id="andmed">' + j(andmed) + '<\/script>\n'
    + '<script type="application/json" id="otsused">' + j(uuedOtsused) + '<\/script>\n'
    + '<script id="app">' + app + '<\/script>\n</body>\n</html>';
}

async function salvesta() {
  const nupp = $('#salvesta');
  if (!nupp || nupp.disabled) return;
  nupp.disabled = true;
  nupp.textContent = 'salvestan…';

  const uued = Object.assign({}, otsused);
  for (const id of Object.keys(ootel)) {
    if (ootel[id] === null) delete uued[id]; else uued[id] = ootel[id];
  }

  try {
    const a = await window.claude.use('artifact');
    if (!a) throw { code: 'not_granted' };
    await a.publish(dokument(uued));
    /* Õnnestumisel laeb vaade ise uue versiooni peale. */
  } catch (e) {
    const kood = (e && e.code) || 'upstream_error';
    nupp.disabled = false;
    nupp.textContent = 'Salvesta lehele';
    if (kood === 'conflict') {
      teade('Keegi jõudis enne — leht laeb uue versiooni. Sinu viimane muudatus läks kaotsi, tee uuesti.');
    } else if (kood === 'not_granted' || kood === 'not_writer' || kood === 'not_declared'
               || kood === 'capability_disabled' || kood === 'capability_removed') {
      kirjutamine = 'ei';
      joonista();
      teade('Sellel vaatel ei ole kirjutusõigust. Muudatused on alles — kopeeri need allpool oleva nupuga.');
    } else if (kood === 'rate_limited') {
      teade('Liiga tihe salvestamine. Oota hetk ja proovi uuesti.');
    } else if (kood === 'too_large') {
      teade('Leht on salvestamiseks liiga suur.');
    } else {
      teade('Salvestamine ei õnnestunud (' + kood + '). Muudatused on alles.');
    }
  }
}

function teade(t) {
  const el = $('#teade');
  if (!el) return;
  el.textContent = t;
  el.hidden = false;
}

/* ── Joonistamine ────────────────────────────────────────────────── */

function joonista() {
  const korvid = ['wrong', 'guess', 'blank', 'todo'];

  for (const võti of korvid) {
    const kirjed = andmed[võti];
    const konteiner = document.getElementById('list-' + võti);
    if (!konteiner) continue;
    /* Otsustatud lugu kaob korvist ära, kui teda just nähtavale ei tõmmata. */
    const nähtavad = naitaTehtuid[võti] ? kirjed : kirjed.filter((k) => !seis(k));
    konteiner.innerHTML = võti === 'wrong'
      ? nähtavad.map(kaart).join('')
      : nähtavad.map((k) => rida(k, võti === 'guess')).join('');

    /* Tehtute arv tuleb otsustest, mitte nähtavate ridade arvust — muidu
       läheb ta näitamise ajal nulli ja peitmisnupp kaob ära. */
    const tehtudArv = kirjed.filter((k) => seis(k)).length;
    const ootelArv = kirjed.length - tehtudArv;
    const loendur = document.getElementById('count-' + võti);
    if (loendur) {
      if (tehtudArv > 0) {
        loendur.innerHTML = ootelArv + ' ootel · '
          + '<button class="linknupp" data-naita="' + võti + '">'
          + tehtudArv + ' tehtud' + (naitaTehtuid[võti] ? ' — peida' : '') + '</button>';
      } else {
        loendur.textContent = kirjed.length + ' lugu';
      }
    }
    const tehtud = tehtudArv;
    const number = document.getElementById('n-' + võti);
    if (number) number.textContent = String(kirjed.length - tehtud);
  }

  const n = muudatusi();
  const riba = $('#riba');
  riba.hidden = n === 0;
  $('#riba__n').textContent = n === 1 ? '1 muudatus' : n + ' muudatust';
  const nupp = $('#salvesta');
  nupp.hidden = kirjutamine === 'ei';
  nupp.disabled = false;
  nupp.textContent = 'Salvesta lehele';

  const kokku = Object.keys(Object.assign({}, otsused, ootel)).length;
  $('#json').textContent = overrides();
  $('#jsonplokk').hidden = kokku === 0;
}

/* ── Sündmused ───────────────────────────────────────────────────── */

document.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-teha]');
  if (b) {
    const id = b.dataset.id;
    const praegu = otsus(id);
    if (b.dataset.teha === 'tyhista') {
      pane(id, null);
    } else if (b.dataset.teha === 'ok') {
      const k = leia(id);
      pane(id, (praegu && praegu.laad === 'ok') ? null
        : { laad: 'ok', yt: k.olemasYt || undefined, sp: k.olemasSp || undefined });
    } else {
      const k = leia(id);
      pane(id, (praegu && praegu.laad === 'vale') ? null
        : { laad: 'vale', mis: k.olemasYt ? 'yt' : (k.olemasSp ? 'sp' : 'mõlemad') });
    }
    return;
  }
  const t = e.target.closest('button[data-naita]');
  if (t) {
    const v = t.dataset.naita;
    naitaTehtuid[v] = !naitaTehtuid[v];
    joonista();
    return;
  }
  if (e.target.id === 'kopeeri') {
    navigator.clipboard.writeText(overrides()).then(
      () => { e.target.textContent = 'kopeeritud'; setTimeout(() => { e.target.textContent = 'kopeeri'; }, 1600); },
      () => teade('Kopeerimine ei õnnestunud — vali tekst käsitsi.'),
    );
  }
  if (e.target.id === 'salvesta') salvesta();
});

document.addEventListener('change', (e) => {
  const el = e.target.closest('.fix__in');
  if (!el) return;
  const id = el.dataset.id;
  const l = loeLink(el.value);
  if (!el.value.trim()) { pane(id, null); return; }
  /* Bandcampi permalink on omaette juhtum, mitte lihtsalt vigane sisend —
     link ise on õige, aga mängija ei saa sellest ID-sid kätte. Ütleme, kust
     need võtta, muidu jääks inimene arvama, et aadress oli katki. */
  if (l && l.liik === 'bc-puudulik') {
    el.classList.add('vigane');
    teade('Bandcampi permalingist ei saa mängijat teha — ID-d on ainult embed-koodis. '
      + 'Ava loo lehel Share → Embed ja kleebi see <iframe> siia.');
    return;
  }
  if (!l) {
    el.classList.add('vigane');
    teade('Sellest ei tulnud linki välja. Oodatud on YouTube\'i, Spotify või SoundCloudi '
      + 'aadress või Bandcampi embed-kood.');
    return;
  }
  el.classList.remove('vigane');
  const v = { laad: 'link' };
  if (l.liik === 'bc') v.bc = l.bc;
  else if (l.liik === 'sc') v.sc = l.url;
  else v[l.liik] = l.id;
  pane(id, v);
});

function leia(id) {
  for (const võti of ['wrong', 'guess', 'blank', 'todo']) {
    const k = andmed[võti].find((x) => x.id === id);
    if (k) return k;
  }
  return {};
}

/* Kirjutusõigust ei saa enne esimest kutset teada — võimekuse olemasolu
   ei tähenda veel õigust. Küsime vaikselt ette, et Salvesta-nuppu mitte
   näidata seal, kus ta kunagi ei tööta. */
/* Kui laadimisel oli salvestamata sisestusi, ütleme seda välja — vaikselt
   taastatud töö on sama segane kui vaikselt kadunud töö. */
if (muudatusi() > 0) {
  teade(muudatusi() + ' salvestamata muudatust taastati. Vajuta Salvesta, et nad püsima jääksid.');
}

window.claude && window.claude.use('artifact').then((a) => {
  kirjutamine = a ? 'jah' : 'ei';
  joonista();
}, () => { kirjutamine = 'ei'; joonista(); });

joonista();
`;
