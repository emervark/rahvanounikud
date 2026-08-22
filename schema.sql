-- Rahvanõunikud — D1 skeem.
--
-- Käivita:
--   npx wrangler d1 execute rahvanounikud --local --file=schema.sql   (arendus)
--   npx wrangler d1 execute rahvanounikud --remote --file=schema.sql  (päris)

-- Kasutajad. google_sub on NULL seni, kuni inimene pole sisse loginud —
-- anonüümne hindaja on täisväärtuslik kasutaja, mitte eriolukord.
CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  google_sub   TEXT UNIQUE,
  display_name TEXT,
  created_at   INTEGER NOT NULL
);

-- Lood. Seemendatakse data/episodes.json põhjal (npm run seed:sql).
-- Olemas selleks, et hindeid saaks vastu võtta ainult päris lugudele.
CREATE TABLE IF NOT EXISTS songs (
  id           TEXT PRIMARY KEY,
  episode_guid TEXT NOT NULL,
  artists      TEXT NOT NULL,
  title        TEXT NOT NULL,
  published_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_songs_episode ON songs(episode_guid);

-- Üks hinne kasutaja ja loo kohta. Kordushinne asendab vana.
CREATE TABLE IF NOT EXISTS ratings (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  song_id    TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  score      INTEGER NOT NULL CHECK (score BETWEEN 1 AND 10),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, song_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_song ON ratings(song_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user_updated ON ratings(user_id, updated_at);

-- Koondnäitajad eraldi tabelis, et edetabeli lugemine ei nõuaks iga kord
-- kõigi hinnete kokkulöömist. Uuendatakse hindega samas batch'is.
CREATE TABLE IF NOT EXISTS song_stats (
  song_id TEXT PRIMARY KEY REFERENCES songs(id) ON DELETE CASCADE,
  cnt     INTEGER NOT NULL DEFAULT 0,
  total   INTEGER NOT NULL DEFAULT 0
);
