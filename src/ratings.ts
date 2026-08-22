// Hinnete lugemine ja kirjutamine.

export const MIN_SCORE = 1;
export const MAX_SCORE = 10;

/** Kui palju hindeid tohib üks kasutaja minutis anda. */
const WRITES_PER_MINUTE = 40;

export interface StatsRow {
  songId: string;
  count: number;
  average: number;
}

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export function validateScore(value: unknown): number {
  const score = Number(value);
  if (!Number.isInteger(score) || score < MIN_SCORE || score > MAX_SCORE) {
    throw new ApiError(400, `Hinne peab olema täisarv vahemikus ${MIN_SCORE}–${MAX_SCORE}.`);
  }
  return score;
}

export function validateSongId(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 120) {
    throw new ApiError(400, 'Vigane loo ID.');
  }
  return value;
}

/**
 * Kõigi lugude koondhinded korraga.
 *
 * Neid on ~376 rida ehk paar kümmet kilobaiti — terve komplekt korraga on odavam
 * kui iga saate kohta eraldi päring, ja tulemust saab serva peal vahemällu panna.
 */
export async function readStats(db: D1Database): Promise<Record<string, StatsRow>> {
  const { results } = await db
    .prepare('SELECT song_id, cnt, total FROM song_stats WHERE cnt > 0')
    .all<{ song_id: string; cnt: number; total: number }>();

  const out: Record<string, StatsRow> = {};
  for (const row of results) {
    out[row.song_id] = {
      songId: row.song_id,
      count: row.cnt,
      average: row.total / row.cnt,
    };
  }
  return out;
}

export async function readMine(db: D1Database, userId: string): Promise<Record<string, number>> {
  const { results } = await db
    .prepare('SELECT song_id, score FROM ratings WHERE user_id = ?')
    .bind(userId)
    .all<{ song_id: string; score: number }>();

  return Object.fromEntries(results.map((r) => [r.song_id, r.score]));
}

async function assertSongExists(db: D1Database, songId: string): Promise<void> {
  const row = await db.prepare('SELECT 1 FROM songs WHERE id = ?').bind(songId).first();
  if (!row) throw new ApiError(404, 'Sellist lugu ei ole.');
}

async function assertUnderRateLimit(db: D1Database, userId: string): Promise<void> {
  const since = Date.now() - 60_000;
  const row = await db
    .prepare('SELECT COUNT(*) AS n FROM ratings WHERE user_id = ? AND updated_at > ?')
    .bind(userId, since)
    .first<{ n: number }>();

  if ((row?.n ?? 0) >= WRITES_PER_MINUTE) {
    throw new ApiError(429, 'Liiga palju hindeid korraga. Oota hetk.');
  }
}

/** Kasutaja rida tekib alles esimesel hindel — niisama sirvijat pole vaja salvestada. */
function ensureUser(db: D1Database, userId: string, now: number): D1PreparedStatement {
  return db
    .prepare('INSERT INTO users (id, created_at) VALUES (?, ?) ON CONFLICT(id) DO NOTHING')
    .bind(userId, now);
}

/**
 * Arvutab loo koondnäitajad hinnetest uuesti.
 *
 * Meelega täisarvutus, mitte juurdekasv: juurdekasv triivib aja jooksul paigast
 * (katkenud kirjutamine, käsitsi parandus) ja vale keskmine on nähtav kõigile.
 * Ühe indekseeritud loo kokkulöömine on selle kindluse hind.
 */
function recomputeStats(db: D1Database, songId: string): D1PreparedStatement {
  return db.prepare(`
    INSERT INTO song_stats (song_id, cnt, total)
    VALUES (
      ?1,
      (SELECT COUNT(*) FROM ratings WHERE song_id = ?1),
      (SELECT COALESCE(SUM(score), 0) FROM ratings WHERE song_id = ?1)
    )
    ON CONFLICT(song_id) DO UPDATE SET cnt = excluded.cnt, total = excluded.total
  `).bind(songId);
}

export async function writeRating(
  db: D1Database,
  userId: string,
  songId: string,
  score: number,
): Promise<StatsRow> {
  await assertSongExists(db, songId);
  await assertUnderRateLimit(db, userId);

  const now = Date.now();
  await db.batch([
    ensureUser(db, userId, now),
    db.prepare(`
      INSERT INTO ratings (user_id, song_id, score, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, song_id)
      DO UPDATE SET score = excluded.score, updated_at = excluded.updated_at
    `).bind(userId, songId, score, now, now),
    recomputeStats(db, songId),
  ]);

  return readSongStats(db, songId);
}

export async function deleteRating(
  db: D1Database,
  userId: string,
  songId: string,
): Promise<StatsRow> {
  await db.batch([
    db.prepare('DELETE FROM ratings WHERE user_id = ? AND song_id = ?').bind(userId, songId),
    recomputeStats(db, songId),
  ]);

  return readSongStats(db, songId);
}

async function readSongStats(db: D1Database, songId: string): Promise<StatsRow> {
  const row = await db
    .prepare('SELECT cnt, total FROM song_stats WHERE song_id = ?')
    .bind(songId)
    .first<{ cnt: number; total: number }>();

  const count = row?.cnt ?? 0;
  return { songId, count, average: count > 0 ? (row!.total / count) : 0 };
}

/**
 * Brauserisse jäänud hinnete ületoomine.
 *
 * Olemasolevaid hindeid ei kirjutata üle: serveris olev hinne on uuem tõde kui
 * see, mis on kuskil vanas brauseris seisnud.
 */
export async function importRatings(
  db: D1Database,
  userId: string,
  entries: Record<string, unknown>,
): Promise<number> {
  const pairs = Object.entries(entries).slice(0, 500);
  if (pairs.length === 0) return 0;

  const known = new Set<string>();
  const { results } = await db.prepare('SELECT id FROM songs').all<{ id: string }>();
  for (const row of results) known.add(row.id);

  const valid = pairs.filter(([songId, score]) => {
    if (!known.has(songId)) return false;
    const n = Number(score);
    return Number.isInteger(n) && n >= MIN_SCORE && n <= MAX_SCORE;
  });
  if (valid.length === 0) return 0;

  const now = Date.now();
  await db.batch([
    ensureUser(db, userId, now),
    ...valid.map(([songId, score]) => db.prepare(`
      INSERT INTO ratings (user_id, song_id, score, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, song_id) DO NOTHING
    `).bind(userId, songId, Number(score), now, now)),
    ...valid.map(([songId]) => recomputeStats(db, songId)),
  ]);

  return valid.length;
}
