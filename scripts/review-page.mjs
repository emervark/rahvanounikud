// Ehitab review-list.md kõrvale lehe, kus nimekirja saab ka päriselt läbi
// töötada: iga loo juures on väli, kuhu kleepida õige link, ja leht avaldab
// ennast ise uuesti, nii et sisestused püsivad ka teistele avajatele.
//
// Leht on andmepõhine: siin genereeritakse ainult kest ja kaks JSON-plokki,
// kogu renderdus käib brauseris. Teisiti ei saakski — leht peab endast uue
// täisdokumendi kokku panema ilma elavat DOM-i seerialiseerimata, ja selleks
// peab tal olema oma lähtekood käepärast.
//
// Käivitatakse review-list.mjs seest.

import { APP } from './review-app.mjs';

/* JSON läheb <script>-elemendi sisse, seega peab „<” olema põgenetud — muidu
   lõpetaks mõne loo pealkirjas olev märk skriptiploki ennatlikult. */
const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

/** Ühest reast lehe jaoks nii palju, kui vaja — mitte tervet lugu. */
function kirje(r) {
  return {
    id: r.song.id,
    esitaja: r.song.artistsRaw,
    pealkiri: r.song.title,
    nr: r.nr,
    kuupäev: r.episode.publishedAt.slice(0, 10),
    ytOtsi: r.ytSearch,
    spOtsi: r.spSearch,
  };
}

export function buildPage({ wrong, guess, blank, todo, meta }) {
  const andmed = {
    wrong: wrong.map((r) => {
      const lingid = [];
      if (r.kahtlaneSp) {
        lingid.push({ liik: 'sp', vaste: r.spName, kindlus: r.spConf,
          url: `https://open.spotify.com/track/${r.song.spotifyId}` });
      }
      if (r.kahtlaneYt) {
        lingid.push({ liik: 'yt', vaste: r.ytName, kindlus: r.ytConf,
          url: `https://www.youtube.com/watch?v=${r.song.youtubeId}` });
      }
      return { ...kirje(r), lingid, saabKinnitada: true,
        olemasYt: r.song.youtubeId ?? null, olemasSp: r.song.spotifyId ?? null };
    }),
    guess: guess.map((r) => ({
      ...kirje(r),
      pakkumine: r.ytGuess,
      pakkumineUrl: r.ytGuessId ? `https://www.youtube.com/watch?v=${r.ytGuessId}` : null,
      kindlus: r.ytConf,
      saabKinnitada: false, olemasYt: null, olemasSp: r.song.spotifyId ?? null,
    })),
    blank: blank.map((r) => ({ ...kirje(r), saabKinnitada: false, olemasYt: null, olemasSp: null })),
    todo: todo.map((r) => ({ ...kirje(r), saabKinnitada: false, olemasYt: null, olemasSp: r.song.spotifyId ?? null })),
  };

  const sektsioon = (võti, toon, pealkiri, seletus, list) => `
  <section>
    <div class="shead">
      <div class="shead__top">
        <h2><span class="dot" style="--tone: var(--${toon})"></span> ${pealkiri}</h2>
        <span class="count" id="count-${võti}"></span>
      </div>
      <p class="note">${seletus}</p>
    </div>
    ${list}
  </section>`;

  const kest = `
  <header class="masthead">
    <p class="eyebrow">Rahvanõunikud · kuulamislingid</p>
    <h1>Mis vajab käsitsi pilku</h1>
    <p class="lede">
      Automaatne sobitamine viib ${meta.songs} loost enamiku õigesse kohta, aga
      jätab kolm halli ala. Leiad õige lingi — kleebi ta loo juurde ja vajuta
      Salvesta. Leht jätab meelde, ka teistele avajatele.
      Kindluse lävi on ${meta.threshold}, kahtlaseks loeme alla ${meta.shaky}.
    </p>

    <div class="tally">
      <div class="tally__item" style="--tone: var(--warn)">
        <span class="tally__n" id="n-wrong">${wrong.length}</span>
        <span class="tally__k">kahtlane link üleval</span>
      </div>
      <div class="tally__item" style="--tone: var(--guess)">
        <span class="tally__n" id="n-guess">${guess.length}</span>
        <span class="tally__k">pakkumine läve all</span>
      </div>
      <div class="tally__item" style="--tone: var(--gap)">
        <span class="tally__n" id="n-blank">${blank.length}</span>
        <span class="tally__k">kumbki link puudub</span>
      </div>
      <div class="tally__item" style="--tone: var(--wait)">
        <span class="tally__n">${todo.length}</span>
        <span class="tally__k">YouTube veel otsimata</span>
      </div>
    </div>
    <p class="teade" id="teade" hidden></p>
  </header>
${sektsioon('wrong', 'warn', 'Kahtlane link on üleval',
  `Need on kuulajale juba nähtavad, seega vale link on halvem kui puuduv.
   Enamik on tegelikult õiged — kindlus langeb ka siis, kui YouTube'i
   pealkirjas artistit ei ole või kui kirjapilt erineb. Madalaim kindlus on
   eespool, nii et allapoole jõudes muutub kontrollimine kiiresti mõttetuks.`,
  '<div class="cards" id="list-wrong" data-list></div>')}
${sektsioon('guess', 'guess', 'Pakkumine jäi läve alla',
  `Otsing leidis midagi, aga mitte piisavalt kindlalt. Osa on õiged, osa
   täiesti mööda, osa on õige lugu vales versioonis („slowed + reverb").`,
  '<ul class="rows" id="list-guess" data-list></ul>')}
${sektsioon('blank', 'gap', 'Kumbki link puudub',
  `Ei Spotifys ega YouTube'is. Osa neist ei olegi voogedastuses — siis märgi
   „pole olemas", nii et nad nimekirjast kaovad.`,
  '<ul class="rows" id="list-blank" data-list></ul>')}

  <section>
    <div class="shead">
      <div class="shead__top">
        <h2><span class="dot" style="--tone: var(--wait)"></span> YouTube veel otsimata</h2>
        <span class="count" id="count-todo"></span>
      </div>
      <p class="note">
        Automaatne otsing jõuab nendeni päevakvoodi jagu korraga, ligi
        ${Math.ceil(todo.length / 90)} päevaga. Spotify link on olemas, nii et lugu
        on lehel juba kuulatav — aga kui leiad YouTube'i lingi kiiremini ise,
        kleebi ta siia ja otsing ei pea seda enam tegema.
      </p>
    </div>
    <pre><code>npm run resolve:youtube &amp;&amp; npm run build:data &amp;&amp; npm run deploy</code></pre>
    <ul class="rows" id="list-todo" data-list></ul>
  </section>

  <section class="howto" id="jsonplokk" hidden>
    <div class="shead__top">
      <h2>Valmis parandused</h2>
      <button class="btn" id="kopeeri">kopeeri</button>
    </div>
    <p class="note">
      See läheb <code>data/overrides.json</code> faili <code>songs</code> alla.
      Pärast seda <code>npm run build:data &amp;&amp; npm run deploy</code>, ja
      nimekirja värskendamiseks <code>npm run review</code>. Käsitsi kinnitatud
      lugu kaob nimekirjast ka siis, kui automaatne kindlus jäi madalaks.
    </p>
    <pre><code id="json"></code></pre>
  </section>

  <div class="riba" id="riba" hidden>
    <span id="riba__n"></span>
    <button class="btn btn--primary" id="salvesta">Salvesta lehele</button>
  </div>`;

  return `<title>Puuduvad ja kahtlased lingid</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;800&family=Space+Mono:wght@400;700&display=swap">
<style id="css">${CSS}</style>
<div id="kest">${kest}</div>
<script type="application/json" id="andmed">${json(andmed)}</script>
<script type="application/json" id="otsused">${json(meta.otsused ?? {})}</script>
<script id="app">${APP}</script>`;
}

/* Palett tuleb Rahvanõunike enda lehelt — see nimekiri on selle lehe tööriist,
   mitte eraldi asi. Neutraalid on paberi poole soojad, mitte puhas hall. */
const CSS = `
:root {
  --ground: #f5f3ef;
  --card: #fffefb;
  --ink: #14120f;
  --muted: #6c665c;
  --line: #ddd8cf;
  --line-soft: #e9e5dd;
  --field: #fbf9f5;

  --warn: #c69a2c;
  --guess: #8a97c9;
  --gap: #c07ba4;
  --wait: #8fa38a;
  --ok: #5f8a5a;
  --accent: #a1256b;

  --shadow: 0 1px 2px rgba(20, 18, 15, 0.05);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --ground: #14120f; --card: #1d1a16; --ink: #efece5; --muted: #a09889;
    --line: #35302a; --line-soft: #272320; --field: #14120f;
    --warn: #d8b054; --guess: #9fabd8; --gap: #d295b8; --wait: #a3b79e;
    --ok: #8bb585; --accent: #e08cba;
    --shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  }
}
:root[data-theme="dark"] {
  --ground: #14120f; --card: #1d1a16; --ink: #efece5; --muted: #a09889;
  --line: #35302a; --line-soft: #272320; --field: #14120f;
  --warn: #d8b054; --guess: #9fabd8; --gap: #d295b8; --wait: #a3b79e;
  --ok: #8bb585; --accent: #e08cba;
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
  max-width: 940px;
  margin: 0 auto;
  padding: 56px 24px 140px;
  display: flex;
  flex-direction: column;
  gap: 52px;
}

code, .conf, .todo__ep, .card__meta, .row__id, .eyebrow, .count, .src, .go, .btn, .fix__in {
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
.lede { margin: 0; max-width: 62ch; color: var(--muted); }

.teade {
  margin: 4px 0 0; padding: 10px 14px; border-radius: 3px;
  background: var(--card); border: 1px solid var(--warn);
  color: var(--ink); font-size: 14px;
}

.tally {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px; margin-top: 6px;
}
.tally__item {
  background: var(--card); border: 1px solid var(--line);
  border-left: 4px solid var(--tone); border-radius: 3px;
  padding: 14px 16px; box-shadow: var(--shadow);
  display: flex; flex-direction: column; gap: 2px;
}
.tally__n { font-size: 30px; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
.tally__k { font-size: 12px; color: var(--muted); line-height: 1.35; }

section { display: flex; flex-direction: column; gap: 18px; }
.shead { display: flex; flex-direction: column; gap: 8px; }
.shead__top { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.dot { width: 9px; height: 9px; border-radius: 50%; background: var(--tone); flex: none; }
h2 {
  font-size: 20px; font-weight: 700; margin: 0; letter-spacing: -0.01em;
  display: flex; align-items: center; gap: 10px;
}
.count { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }
.note { margin: 0; color: var(--muted); font-size: 14px; max-width: 64ch; }

.cards { display: flex; flex-direction: column; gap: 12px; }
.card {
  background: var(--card); border: 1px solid var(--line);
  border-radius: 3px; box-shadow: var(--shadow); overflow: hidden;
}
.card--done, .row--done { opacity: 0.62; }
.card__head { padding: 14px 16px 10px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; }
.card__title { margin: 0; font-size: 16px; font-weight: 600; flex: 1 1 auto; min-width: 0; }
.dash { color: var(--muted); font-weight: 400; }
.card__meta { margin: 0; font-size: 11px; color: var(--muted); flex: 1 0 100%; }

.chip {
  font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 0.6px;
  padding: 3px 7px; border-radius: 2px; border: 1px solid currentColor; white-space: nowrap;
}
.chip--ok { color: var(--ok); }
.chip--gap { color: var(--gap); }

.cmp { border-top: 1px solid var(--line-soft); }
.cmp__row {
  display: grid; grid-template-columns: 74px 1fr auto auto auto;
  align-items: center; gap: 10px; padding: 10px 16px;
}
.cmp__row + .cmp__row { border-top: 1px solid var(--line-soft); }
.cmp__got { min-width: 0; overflow-wrap: anywhere; font-size: 14px; }

.src {
  font-size: 10px; letter-spacing: 0.8px; text-transform: uppercase;
  padding: 3px 6px; border-radius: 2px; text-align: center;
  border: 1px solid var(--line); color: var(--muted);
}
.src--sp { border-color: var(--wait); color: var(--wait); }
.src--yt { border-color: var(--gap); color: var(--gap); }

.card__foot {
  display: flex; gap: 16px; flex-wrap: wrap;
  padding: 10px 16px; border-top: 1px solid var(--line-soft); font-size: 12px;
}

/* Sisestusriba: väli, kuhu kleepida õige link, ja kaks kiiret otsust. */
.fix {
  display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
  padding: 10px 16px; border-top: 1px solid var(--line-soft);
}
.row .fix { padding: 8px 0 0; border-top: 0; }
.fix__in {
  flex: 1 1 260px; min-width: 0;
  padding: 7px 10px; font-size: 12px;
  background: var(--field); color: var(--ink);
  border: 1px solid var(--line); border-radius: 2px;
}
.fix__in::placeholder { color: var(--muted); }
.fix__in.vigane { border-color: var(--gap); }

.btn {
  font-size: 11px; letter-spacing: 0.6px; padding: 7px 12px;
  background: transparent; color: var(--muted);
  border: 1px solid var(--line); border-radius: 2px; cursor: pointer;
}
.btn:hover { color: var(--ink); border-color: var(--muted); }
.btn.on { color: var(--ok); border-color: var(--ok); }
.btn--x { padding: 7px 9px; }
.btn--primary {
  background: var(--accent); color: var(--ground);
  border-color: var(--accent); font-weight: 700;
}
.btn--primary:hover { color: var(--ground); opacity: 0.88; }
.btn[disabled] { opacity: 0.5; cursor: default; }

ul.rows { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.row {
  display: grid; grid-template-columns: 1fr auto; gap: 4px 16px;
  padding: 14px 2px; border-top: 1px solid var(--line-soft); align-items: start;
}
.row:last-child { border-bottom: 1px solid var(--line-soft); }
.row__main { min-width: 0; }
.row__name { margin: 0; font-weight: 500; overflow-wrap: anywhere; }
.row__guess { margin: 2px 0 0; font-size: 13px; color: var(--muted); overflow-wrap: anywhere; }
.row__side { display: flex; align-items: center; gap: 10px; white-space: nowrap; }
.row__id { grid-column: 1 / -1; margin: 2px 0 0; font-size: 11px; color: var(--muted); }
.row__fix { grid-column: 1 / -1; }

.go {
  color: var(--accent); font-size: 12px; text-decoration: none;
  border-bottom: 1px solid currentColor;
}
.go:hover { color: var(--ink); }

.meter {
  display: inline-block; width: 46px; height: 5px;
  background: var(--line); border-radius: 3px; overflow: hidden; flex: none;
}
.meter__fill { display: block; height: 100%; }
.meter__fill--warn { background: var(--warn); }
.meter__fill--guess { background: var(--guess); }
.conf { font-size: 12px; font-variant-numeric: tabular-nums; color: var(--muted); min-width: 2.6em; display: inline-block; }

.todo { list-style: none; margin: 0; padding: 0; columns: 2; column-gap: 30px; font-size: 13px; }
.todo li { break-inside: avoid; padding: 3px 0; line-height: 1.4; }
.todo__ep { color: var(--muted); font-size: 10px; white-space: nowrap; }

.howto {
  background: var(--card); border: 1px solid var(--line);
  border-radius: 3px; padding: 20px 22px; gap: 12px;
}
pre {
  margin: 0; padding: 14px 16px; overflow-x: auto;
  background: var(--ground); border: 1px solid var(--line-soft);
  border-radius: 3px; font-size: 13px; line-height: 1.55;
}

/* Salvestusriba jääb ekraani alla, et pikas nimekirjas ei peaks teda otsima. */
.riba {
  position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%);
  display: flex; align-items: center; gap: 14px;
  padding: 10px 14px; border-radius: 3px;
  background: var(--card); border: 1px solid var(--line);
  box-shadow: 0 6px 20px rgba(20, 18, 15, 0.18);
  font-family: 'Space Mono', monospace; font-size: 12px;
  z-index: 10;
}

a:focus-visible, .btn:focus-visible, .fix__in:focus-visible {
  outline: 2px solid var(--accent); outline-offset: 2px;
}

@media (max-width: 640px) {
  .todo { columns: 1; }
  .cmp__row { grid-template-columns: 1fr; }
  .row { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
`;
