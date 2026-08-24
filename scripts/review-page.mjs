// Ehitab review-list.md kõrvale sama sisuga veebilehe.
//
// Markdown on hea failis hoida, aga nimekirja päriselt läbi töötades tahad
// linke klikkida ja näha kõrvuti, mida me ütlesime ja mida sai lingitud.
// Seda teksti kujul ei näe.
//
// Käivitatakse review-list.mjs seest, eraldi ei ole vaja jooksutada.

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/** Kindlus 0–1 ribana. Number üksi ei ütle midagi, riba annab võrdluse. */
function meter(v, tone) {
  const pct = Math.round((v ?? 0) * 100);
  return `<span class="meter" role="img" aria-label="kindlus ${pct}%">`
    + `<span class="meter__fill meter__fill--${tone}" style="width:${pct}%"></span></span>`
    + `<span class="conf">${(v ?? 0).toFixed(2).replace('.', ',')}</span>`;
}

export function buildPage({ wrong, guess, blank, todo, meta }) {
  const kust = (r) => `${esc(r.episode.title.slice(0, 0))}saade ${r.nr} · ${r.episode.publishedAt.slice(0, 10)}`;
  const nimi = (r) => `${esc(r.song.artistsRaw)} <span class="dash">—</span> ${esc(r.song.title)}`;

  const wrongCards = wrong.map((r) => `
    <article class="card">
      <header class="card__head">
        <h3 class="card__title">${nimi(r)}</h3>
        <p class="card__meta">${kust(r)} · <code>${esc(r.song.id)}</code></p>
      </header>
      <div class="cmp">
        ${r.kahtlaneSp ? `
        <div class="cmp__row">
          <span class="src src--sp">Spotify</span>
          <span class="cmp__got">${esc(r.spName)}</span>
          ${meter(r.spConf, 'warn')}
          <a class="go" href="https://open.spotify.com/track/${esc(r.song.spotifyId)}" target="_blank" rel="noreferrer">kuula&nbsp;↗</a>
        </div>` : ''}
        ${r.kahtlaneYt ? `
        <div class="cmp__row">
          <span class="src src--yt">YouTube</span>
          <span class="cmp__got">${esc(r.ytName)}</span>
          ${meter(r.ytConf, 'warn')}
          <a class="go" href="https://www.youtube.com/watch?v=${esc(r.song.youtubeId)}" target="_blank" rel="noreferrer">vaata&nbsp;↗</a>
        </div>` : ''}
      </div>
      <footer class="card__foot">
        <a href="${esc(r.ytSearch)}" target="_blank" rel="noreferrer">otsi YouTube'ist</a>
        <a href="${esc(r.spSearch)}" target="_blank" rel="noreferrer">otsi Spotifyst</a>
      </footer>
    </article>`).join('');

  const guessRows = guess.map((r) => `
    <li class="row">
      <div class="row__main">
        <p class="row__name">${nimi(r)}</p>
        <p class="row__guess">pakub: ${esc(r.ytGuess ?? '—')}</p>
      </div>
      <div class="row__side">
        ${meter(r.ytConf, 'guess')}
        ${r.ytGuessId ? `<a class="go" href="https://www.youtube.com/watch?v=${esc(r.ytGuessId)}" target="_blank" rel="noreferrer">vaata&nbsp;↗</a>` : '<span class="go go--off">—</span>'}
        <a class="go" href="${esc(r.ytSearch)}" target="_blank" rel="noreferrer">otsi&nbsp;↗</a>
      </div>
      <p class="row__id"><code>${esc(r.song.id)}</code> · ${kust(r)}</p>
    </li>`).join('');

  const blankRows = blank.map((r) => `
    <li class="row row--tight">
      <div class="row__main">
        <p class="row__name">${nimi(r)}</p>
        <p class="row__id"><code>${esc(r.song.id)}</code> · ${kust(r)}</p>
      </div>
      <div class="row__side">
        <a class="go" href="${esc(r.ytSearch)}" target="_blank" rel="noreferrer">YouTube&nbsp;↗</a>
        <a class="go" href="${esc(r.spSearch)}" target="_blank" rel="noreferrer">Spotify&nbsp;↗</a>
      </div>
    </li>`).join('');

  const todoItems = todo.map((r) => `
    <li><span class="todo__name">${nimi(r)}</span> <span class="todo__ep">${kust(r)}</span></li>`).join('');

  return `<title>Puuduvad ja kahtlased lingid</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;800&family=Space+Mono:wght@400;700&display=swap">
<style>
/* Palett tuleb Rahvanõunike enda lehelt — see nimekiri on selle lehe
   tööriist, mitte eraldi asi. Neutraalid on paberi poole soojad. */
:root {
  --ground: #f5f3ef;
  --card: #fffefb;
  --ink: #14120f;
  --muted: #6c665c;
  --line: #ddd8cf;
  --line-soft: #e9e5dd;

  --warn: #c69a2c;   /* üleval, aga kahtlane */
  --guess: #8a97c9;  /* pakkumine olemas */
  --gap: #c07ba4;    /* linki pole */
  --wait: #8fa38a;   /* ootab kvooti */
  --accent: #a1256b;

  --shadow: 0 1px 2px rgba(20, 18, 15, 0.05);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --ground: #14120f;
    --card: #1d1a16;
    --ink: #efece5;
    --muted: #a09889;
    --line: #35302a;
    --line-soft: #272320;
    --warn: #d8b054;
    --guess: #9fabd8;
    --gap: #d295b8;
    --wait: #a3b79e;
    --accent: #e08cba;
    --shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  }
}
:root[data-theme="dark"] {
  --ground: #14120f;
  --card: #1d1a16;
  --ink: #efece5;
  --muted: #a09889;
  --line: #35302a;
  --line-soft: #272320;
  --warn: #d8b054;
  --guess: #9fabd8;
  --gap: #d295b8;
  --wait: #a3b79e;
  --accent: #e08cba;
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

.wrap {
  max-width: 940px;
  margin: 0 auto;
  padding: 56px 24px 96px;
  display: flex;
  flex-direction: column;
  gap: 52px;
}

code, .mono, .conf, .todo__ep, .card__meta, .row__id {
  font-family: 'Space Mono', ui-monospace, Menlo, monospace;
}

/* ── Päis ─────────────────────────────────────────────── */
.masthead { display: flex; flex-direction: column; gap: 14px; }
.eyebrow {
  font-family: 'Space Mono', ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 1.6px;
  text-transform: uppercase;
  color: var(--muted);
  margin: 0;
}
h1 {
  font-size: clamp(30px, 5vw, 42px);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
  margin: 0;
  text-wrap: balance;
}
.lede { margin: 0; max-width: 62ch; color: var(--muted); }

/* Kokkuvõte: neli korvi, iga oma värvitriibuga. Triip kannab tähendust —
   ülalt alla kahaneb kiireloomulisus. */
.tally {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
  margin-top: 6px;
}
.tally__item {
  background: var(--card);
  border: 1px solid var(--line);
  border-left: 4px solid var(--tone);
  border-radius: 3px;
  padding: 14px 16px;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.tally__n {
  font-size: 30px;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.tally__k { font-size: 12px; color: var(--muted); line-height: 1.35; }

/* ── Sektsioonid ──────────────────────────────────────── */
section { display: flex; flex-direction: column; gap: 18px; }
.shead { display: flex; flex-direction: column; gap: 8px; }
.shead__top { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.dot { width: 9px; height: 9px; border-radius: 50%; background: var(--tone); flex: none; }
h2 {
  font-size: 20px; font-weight: 700; margin: 0; letter-spacing: -0.01em;
  display: flex; align-items: center; gap: 10px;
}
.count {
  font-family: 'Space Mono', monospace; font-size: 12px; color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.note { margin: 0; color: var(--muted); font-size: 14px; max-width: 64ch; }

/* ── Kaardid (korv 1) ─────────────────────────────────── */
.cards { display: flex; flex-direction: column; gap: 12px; }
.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 3px;
  box-shadow: var(--shadow);
  overflow: hidden;
}
.card__head { padding: 14px 16px 10px; }
.card__title { margin: 0; font-size: 16px; font-weight: 600; }
.dash { color: var(--muted); font-weight: 400; }
.card__meta { margin: 3px 0 0; font-size: 11px; color: var(--muted); }
.card__meta code { font-size: 11px; }

.cmp { border-top: 1px solid var(--line-soft); }
.cmp__row {
  display: grid;
  grid-template-columns: 74px 1fr auto auto auto;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
}
.cmp__row + .cmp__row { border-top: 1px solid var(--line-soft); }
.cmp__got { min-width: 0; overflow-wrap: anywhere; font-size: 14px; }

.src {
  font-family: 'Space Mono', monospace;
  font-size: 10px; letter-spacing: 0.8px; text-transform: uppercase;
  padding: 3px 6px; border-radius: 2px; text-align: center;
  border: 1px solid var(--line);
  color: var(--muted);
}
.src--sp { border-color: var(--wait); color: var(--wait); }
.src--yt { border-color: var(--gap); color: var(--gap); }

.card__foot {
  display: flex; gap: 16px; flex-wrap: wrap;
  padding: 10px 16px; border-top: 1px solid var(--line-soft);
  font-size: 12px;
}
.card__foot a { color: var(--accent); }

/* ── Read (korvid 2 ja 3) ─────────────────────────────── */
ol.rows, ul.rows { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px 16px;
  padding: 13px 2px;
  border-top: 1px solid var(--line-soft);
  align-items: start;
}
.row:last-child { border-bottom: 1px solid var(--line-soft); }
.row__main { min-width: 0; }
.row__name { margin: 0; font-weight: 500; overflow-wrap: anywhere; }
.row__guess { margin: 2px 0 0; font-size: 13px; color: var(--muted); overflow-wrap: anywhere; }
.row__side { display: flex; align-items: center; gap: 10px; white-space: nowrap; }
.row__id { grid-column: 1 / -1; margin: 4px 0 0; font-size: 11px; color: var(--muted); }
.row--tight .row__id { grid-column: auto; }

.go {
  color: var(--accent);
  font-size: 12px;
  font-family: 'Space Mono', monospace;
  text-decoration: none;
  border-bottom: 1px solid currentColor;
}
.go:hover { color: var(--ink); }
.go--off { color: var(--muted); border: 0; }

/* ── Kindlusriba ──────────────────────────────────────── */
.meter {
  display: inline-block; width: 46px; height: 5px;
  background: var(--line); border-radius: 3px; overflow: hidden; flex: none;
}
.meter__fill { display: block; height: 100%; }
.meter__fill--warn { background: var(--warn); }
.meter__fill--guess { background: var(--guess); }
.conf {
  font-size: 12px; font-variant-numeric: tabular-nums; color: var(--muted);
  min-width: 2.6em; display: inline-block;
}

/* ── Ootenimekiri (korv 4) ────────────────────────────── */
.todo {
  list-style: none; margin: 0; padding: 0;
  columns: 2; column-gap: 30px;
  font-size: 13px;
}
.todo li { break-inside: avoid; padding: 3px 0; line-height: 1.4; }
.todo__name { }
.todo__ep { color: var(--muted); font-size: 10px; white-space: nowrap; }
@media (max-width: 640px) { .todo { columns: 1; } .cmp__row { grid-template-columns: 1fr; } }

/* ── Juhis ────────────────────────────────────────────── */
.howto {
  background: var(--card); border: 1px solid var(--line);
  border-radius: 3px; padding: 20px 22px;
  display: flex; flex-direction: column; gap: 12px;
}
pre {
  margin: 0; padding: 14px 16px; overflow-x: auto;
  background: var(--ground); border: 1px solid var(--line-soft);
  border-radius: 3px; font-size: 13px; line-height: 1.55;
}
a:focus-visible, .go:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
</style>

<div class="wrap">
  <header class="masthead">
    <p class="eyebrow">Rahvanõunikud · kuulamislingid</p>
    <h1>Mis vajab käsitsi pilku</h1>
    <p class="lede">
      Automaatne sobitamine viib ${meta.songs} loost enamiku õigesse kohta, aga
      jätab kolm halli ala: link on üleval, aga kindlus madal; vaste jäi läve
      alla; lugu on lihtsalt läbi käimata. Kindluse lävi on ${meta.threshold},
      kahtlaseks loeme alla ${meta.shaky}.
    </p>

    <div class="tally">
      <div class="tally__item" style="--tone: var(--warn)">
        <span class="tally__n">${wrong.length}</span>
        <span class="tally__k">kahtlane link üleval</span>
      </div>
      <div class="tally__item" style="--tone: var(--guess)">
        <span class="tally__n">${guess.length}</span>
        <span class="tally__k">pakkumine olemas, link puudub</span>
      </div>
      <div class="tally__item" style="--tone: var(--gap)">
        <span class="tally__n">${blank.length}</span>
        <span class="tally__k">kumbki link puudub</span>
      </div>
      <div class="tally__item" style="--tone: var(--wait)">
        <span class="tally__n">${todo.length}</span>
        <span class="tally__k">YouTube veel otsimata</span>
      </div>
    </div>
  </header>

  <section>
    <div class="shead">
      <div class="shead__top">
        <h2><span class="dot" style="--tone: var(--warn)"></span> Kahtlane link on üleval</h2>
        <span class="count">${wrong.length} lugu</span>
      </div>
      <p class="note">
        Need on kuulajale juba nähtavad, seega vale link on halvem kui puuduv.
        Enamik on tegelikult õiged — kindlus langeb ka siis, kui YouTube'i
        pealkirjas artistit ei ole või kui pealkiri on veidi teisiti kirjutatud.
        Madalaim kindlus on eespool, nii et allapoole jõudes muutub kontrollimine
        kiiresti mõttetuks.
      </p>
    </div>
    <div class="cards">${wrongCards || '<p class="note">Puhas.</p>'}</div>
  </section>

  <section>
    <div class="shead">
      <div class="shead__top">
        <h2><span class="dot" style="--tone: var(--guess)"></span> Pakkumine jäi läve alla</h2>
        <span class="count">${guess.length} lugu</span>
      </div>
      <p class="note">
        Otsing leidis midagi, aga mitte piisavalt kindlalt. Osa on õiged, osa
        täiesti mööda, osa on õige lugu vales versioonis („slowed + reverb").
      </p>
    </div>
    <ul class="rows">${guessRows}</ul>
  </section>

  <section>
    <div class="shead">
      <div class="shead__top">
        <h2><span class="dot" style="--tone: var(--gap)"></span> Kumbki link puudub</h2>
        <span class="count">${blank.length} lugu</span>
      </div>
      <p class="note">Ei Spotifys ega YouTube'is. Osa neist ei olegi voogedastuses.</p>
    </div>
    <ul class="rows">${blankRows}</ul>
  </section>

  <section>
    <div class="shead">
      <div class="shead__top">
        <h2><span class="dot" style="--tone: var(--wait)"></span> YouTube veel otsimata</h2>
        <span class="count">${todo.length} lugu</span>
      </div>
      <p class="note">
        Päevakvoot on 90 otsingut, seega ligi ${Math.ceil(todo.length / 90)} päeva.
        Spotify link on neil olemas, nii et lehel on lugu juba kuulatav.
      </p>
    </div>
    <pre><code>npm run resolve:youtube &amp;&amp; npm run build:data &amp;&amp; npm run deploy</code></pre>
    <ul class="todo">${todoItems}</ul>
  </section>

  <section class="howto">
    <h2>Kuidas parandada</h2>
    <p class="note">
      Lisa <code>data/overrides.json</code> faili <code>songs</code> alla. Käsitsi
      kinnitatud lugu kaob sellest nimekirjast ka siis, kui automaatne kindlus
      jäi madalaks.
    </p>
<pre><code>"${esc(meta.naidisId)}": {
  "_note": "miks käsitsi",
  "youtubeId": "videoId",
  "spotifyId": "trackId"
}</code></pre>
    <p class="note">
      Seejärel <code>npm run build:data &amp;&amp; npm run deploy</code>, ja nimekirja
      uuendamiseks <code>npm run review</code>.
    </p>
  </section>
</div>`;
}
