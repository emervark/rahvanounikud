// Test: mis juhtub anonüümselt antud hinnetega, kui inimene sisse logib.
//
// See on kogu sisselogimise juures ainus koht, mis võib päriselt andmeid kaotada,
// ja seda ei saa käsitsi klikkides usaldusväärselt kontrollida — sest vale tulemus
// (kadunud hinne) näeb välja täpselt nagu "ma vist ei hinnanudki seda".
//
// Käivita: node scripts/test-merge.mjs

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/paths.mjs';

const schema = fs.readFileSync(path.join(ROOT, 'schema.sql'), 'utf8');

/** Samad laused, mis src/google-auth.ts mergeAnonymousRatings sees. */
function merge(db, fromUserId, toUserId) {
  const songIds = db.prepare('SELECT song_id FROM ratings WHERE user_id = ?')
    .all(fromUserId).map((r) => r.song_id);

  if (songIds.length === 0) {
    db.prepare('DELETE FROM users WHERE id = ?').run(fromUserId);
    return;
  }

  db.prepare(`
    INSERT INTO ratings (user_id, song_id, score, created_at, updated_at)
    SELECT ?, song_id, score, created_at, updated_at FROM ratings WHERE user_id = ?
    ON CONFLICT(user_id, song_id) DO NOTHING
  `).run(toUserId, fromUserId);
  db.prepare('DELETE FROM ratings WHERE user_id = ?').run(fromUserId);
  db.prepare('DELETE FROM users WHERE id = ?').run(fromUserId);

  for (const songId of songIds) {
    db.prepare(`
      INSERT INTO song_stats (song_id, cnt, total)
      VALUES (
        ?1,
        (SELECT COUNT(*) FROM ratings WHERE song_id = ?1),
        (SELECT COALESCE(SUM(score), 0) FROM ratings WHERE song_id = ?1)
      )
      ON CONFLICT(song_id) DO UPDATE SET cnt = excluded.cnt, total = excluded.total
    `).run(songId);
  }
}

function recompute(db, songId) {
  db.prepare(`
    INSERT INTO song_stats (song_id, cnt, total)
    VALUES (?1, (SELECT COUNT(*) FROM ratings WHERE song_id = ?1),
                (SELECT COALESCE(SUM(score), 0) FROM ratings WHERE song_id = ?1))
    ON CONFLICT(song_id) DO UPDATE SET cnt = excluded.cnt, total = excluded.total
  `).run(songId);
}

function setup() {
  const db = new DatabaseSync(':memory:');
  db.exec(schema);
  for (const id of ['lugu1', 'lugu2', 'lugu3']) {
    db.prepare('INSERT INTO songs (id, episode_guid, artists, title, published_at) VALUES (?,?,?,?,?)')
      .run(id, 'saade', 'Artist', id, '2026-01-01');
  }
  return db;
}

function rate(db, userId, songId, score) {
  db.prepare('INSERT INTO users (id, created_at) VALUES (?, 0) ON CONFLICT(id) DO NOTHING').run(userId);
  db.prepare(`
    INSERT INTO ratings (user_id, song_id, score, created_at, updated_at) VALUES (?,?,?,0,0)
    ON CONFLICT(user_id, song_id) DO UPDATE SET score = excluded.score
  `).run(userId, songId, score);
  recompute(db, songId);
}

const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push({ name, ok, actual, expected });
}

function statsOf(db, songId) {
  const r = db.prepare('SELECT cnt, total FROM song_stats WHERE song_id = ?').get(songId);
  return r ? { cnt: r.cnt, total: r.total } : { cnt: 0, total: 0 };
}

function ratingsOf(db, userId) {
  return Object.fromEntries(
    db.prepare('SELECT song_id, score FROM ratings WHERE user_id = ? ORDER BY song_id')
      .all(userId).map((r) => [r.song_id, r.score]),
  );
}

// ── 1. Esimene sisselogimine: anonüümsest kasutajast saab konto ─────────────
{
  const db = setup();
  rate(db, 'anon', 'lugu1', 8);
  rate(db, 'anon', 'lugu2', 4);
  // Workeris: UPDATE users SET google_sub — kasutaja-ID jääb samaks, hinded ei liigu
  db.prepare('UPDATE users SET google_sub = ? WHERE id = ?').run('google-123', 'anon');

  check('esimene login: hinded jäävad alles', ratingsOf(db, 'anon'), { lugu1: 8, lugu2: 4 });
  check('esimene login: koondhinne muutumatu', statsOf(db, 'lugu1'), { cnt: 1, total: 8 });
}

// ── 2. Tuttav konto: anonüümsed hinded tõstetakse konto alla ────────────────
{
  const db = setup();
  rate(db, 'konto', 'lugu1', 9);          // varem teises seadmes antud
  rate(db, 'anon', 'lugu2', 5);           // selles brauseris antud
  rate(db, 'anon', 'lugu3', 7);
  merge(db, 'anon', 'konto');

  check('ühendamine: kõik hinded on kontol', ratingsOf(db, 'konto'), { lugu1: 9, lugu2: 5, lugu3: 7 });
  check('ühendamine: anonüümne kasutaja kadunud',
    db.prepare('SELECT COUNT(*) c FROM users WHERE id = ?').get('anon').c, 0);
  check('ühendamine: anonüümseid hindeid ei jäänud',
    db.prepare('SELECT COUNT(*) c FROM ratings WHERE user_id = ?').get('anon').c, 0);
}

// ── 3. Konflikt: kontol on samale loole juba hinne ──────────────────────────
{
  const db = setup();
  rate(db, 'konto', 'lugu1', 9);
  rate(db, 'anon', 'lugu1', 2);           // sama lugu, teine hinne
  check('enne ühendamist: kaks häält', statsOf(db, 'lugu1'), { cnt: 2, total: 11 });

  merge(db, 'anon', 'konto');

  check('konflikt: konto hinne jääb peale', ratingsOf(db, 'konto'), { lugu1: 9 });
  // Kaks häält muutusid üheks — kui koondnäitajaid ei arvutataks uuesti,
  // näitaks leht igavesti kahte häält ja valet keskmist.
  check('konflikt: koondhinne arvutati uuesti', statsOf(db, 'lugu1'), { cnt: 1, total: 9 });
}

// ── 4. Anonüümsel kasutajal polnud ühtegi hinnet ────────────────────────────
{
  const db = setup();
  rate(db, 'konto', 'lugu1', 6);
  db.prepare('INSERT INTO users (id, created_at) VALUES (?, 0)').run('anon');
  merge(db, 'anon', 'konto');

  check('tühi anonüümne: konto hinded puutumata', ratingsOf(db, 'konto'), { lugu1: 6 });
  check('tühi anonüümne: kasutaja koristatud',
    db.prepare('SELECT COUNT(*) c FROM users WHERE id = ?').get('anon').c, 0);
}

// ── 5. Sama kasutaja iseendaga (kaitse jaburuse vastu) ──────────────────────
{
  const db = setup();
  rate(db, 'konto', 'lugu1', 6);
  if ('konto' !== 'konto') merge(db, 'konto', 'konto');  // Workeris: if (from === to) return
  check('iseendaga ühendamine: hinne alles', ratingsOf(db, 'konto'), { lugu1: 6 });
}

// ── Kokkuvõte ──────────────────────────────────────────────────────────────
let failed = 0;
for (const r of results) {
  if (r.ok) {
    console.log(`  OK   ${r.name}`);
  } else {
    failed++;
    console.log(`  VIGA ${r.name}`);
    console.log(`       ootasin: ${JSON.stringify(r.expected)}`);
    console.log(`       sain:    ${JSON.stringify(r.actual)}`);
  }
}
console.log(`\n${results.length - failed}/${results.length} testi läbis`);
process.exit(failed === 0 ? 0 : 1);
