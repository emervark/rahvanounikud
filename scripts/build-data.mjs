// Liidab parsitud lood, käsitsi parandused ja lahendatud kuulamislingid
// üheks failiks data/episodes.json, mille frontend staatilise failina laeb.
//
// Siin sünnivad ka lugude püsivad ID-d. See on kogu projekti kõige tundlikum koht:
// hinded seotakse ID külge, nii et ID nihe tähendaks hindeid vale loo küljes.
// Seepärast peab data/song-ids.json lukustusfaili kohtlema nagu migratsiooniajalugu —
// sinna ainult lisatakse, sealt ei kustutata ega muudeta.

import fs from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import {
  DELFI_SHOW_URL, SPOTIFY_SHOW_ID, SPOTIFY_SHOW_URL, PODCAST_ID,
} from './feed-config.mjs';
import { paths } from './lib/paths.mjs';

async function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

/** Diakriitikuta, väiketähtedega, ainult tähed-numbrid-sidekriipsud. */
function slugify(s) {
  const map = { õ: 'o', ä: 'a', ö: 'o', ü: 'u', š: 's', ž: 'z', ø: 'o', å: 'a', æ: 'ae', ß: 'ss' };
  return s
    .toLowerCase()
    .replace(/[õäöüšžøåæß]/g, (c) => map[c] ?? c)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'lugu';
}

/** Sisupõhine võti — sama lugu samas saates annab alati sama võtme. */
function contentKey(guid, song) {
  const artists = (song.artists ?? []).join('|').toLowerCase().trim();
  const title = (song.title ?? '').toLowerCase().trim();
  return `${guid}::${artists}::${title}`;
}

/**
 * Annab igale loole püsiva ID.
 *
 * Sobitamine käib kahes järjekorras:
 *   1. sisu järgi  — muutumatu lugu saab alati sama ID
 *   2. asukoha järgi — kui pealkirja/artisti parandati, päritakse sama koha vana ID,
 *      et juba antud hinded ei jääks orvuks
 * Alles siis tehakse uus ID.
 */
function assignIds(episodes, lock) {
  const byContent = new Map(Object.entries(lock.byContent ?? {}));
  const byPosition = new Map(Object.entries(lock.byPosition ?? {}));
  const used = new Set();
  const stats = { reusedContent: 0, reusedPosition: 0, minted: 0 };

  for (const ep of episodes) {
    ep.songs.forEach((song, index) => {
      const cKey = contentKey(ep.guid, song);
      const pKey = `${ep.guid}::${index}`;

      let id = byContent.get(cKey);
      if (id && !used.has(id)) {
        stats.reusedContent++;
      } else {
        const positional = byPosition.get(pKey);
        if (positional && !used.has(positional)) {
          id = positional;
          stats.reusedPosition++;
        } else {
          const base = `${ep.guid.slice(0, 8)}-${slugify(`${song.artists?.[0] ?? ''} ${song.title}`)}`;
          id = base;
          let n = 2;
          while (used.has(id)) id = `${base}-${n++}`;
          stats.minted++;
        }
      }

      used.add(id);
      song.id = id;
      byContent.set(cKey, id);
      byPosition.set(pKey, id);
    });
  }

  return {
    stats,
    lock: {
      _kirjeldus: 'Lugude püsivad ID-d. AINULT lisatakse — muutmine lahutaks antud hinded lugudest.',
      byContent: Object.fromEntries(byContent),
      byPosition: Object.fromEntries(byPosition),
    },
  };
}

/** "01:17:17" → 4637 */
function durationToSeconds(d) {
  if (!d) return null;
  const parts = d.split(':').map(Number);
  if (parts.some(Number.isNaN)) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

function searchQuery(song) {
  return `${song.artists.join(' ')} ${song.title}`.trim();
}

async function main() {
  const parsed = await readJson(paths.parsed, null);
  if (!parsed) throw new Error('data/parsed-songs.json puudub — käivita esmalt "npm run parse".');

  const rawEpisodes = await readJson(paths.rawEpisodes, []);
  const overrides = await readJson(paths.overrides, { episodes: {}, songs: {} });
  const lock = await readJson(paths.songIds, {});
  const spotify = await readJson(paths.spotifyCache, {});
  const spotifyEpisodes = await readJson(paths.spotifyEpisodes, {});
  const youtube = await readJson(paths.youtubeCache, {});
  const critics = await readJson(paths.criticScores, {});

  const rawByGuid = Object.fromEntries(rawEpisodes.map((e) => [e.guid, e]));

  const episodes = parsed.map((ep) => {
    const raw = rawByGuid[ep.guid] ?? {};
    const override = overrides.episodes?.[ep.guid];

    const songs = (override?.songs ?? ep.songs).map((s) => ({
      artists: s.artists ?? [s.artistsRaw].filter(Boolean),
      artistsRaw: s.artistsRaw ?? (s.artists ?? []).join(', '),
      title: s.title,
      chooser: s.chooser ?? ep.chooser ?? null,
      note: s.note ?? null,
    }));

    return {
      guid: ep.guid,
      title: ep.title,
      publishedAt: ep.publishedAt,
      duration: raw.duration ?? null,
      durationSeconds: durationToSeconds(raw.duration),
      description: raw.description ?? '',
      audioUrl: raw.audioUrl ?? null,
      coverImageUrl: raw.coverImageUrl ?? null,
      delfiUrl: `${DELFI_SHOW_URL}/${ep.guid}`,
      spotifyEpisodeId: spotifyEpisodes[ep.guid]?.id ?? null,
      chooser: ep.chooser ?? null,
      guests: ep.guests ?? [],
      source: override ? 'kasitsi' : 'automaatne',
      songs,
    };
  });

  const { stats, lock: newLock } = assignIds(episodes, lock);

  // Kuulamislingid ja käsitsi parandused ID järgi.
  let withSpotify = 0, withYoutube = 0;
  for (const ep of episodes) {
    for (const song of ep.songs) {
      const fix = overrides.songs?.[song.id] ?? {};
      Object.assign(song, fix);

      song.spotifyId = fix.spotifyId ?? spotify[song.id]?.id ?? null;
      song.youtubeId = fix.youtubeId ?? youtube[song.id]?.id ?? null;
      // Kriitikute hinne tuleb ainult käsitsi — feedis seda ei ole.
      // Lubatud on üks number või kriitikute kaupa; viimasest arvutame keskmise
      // ja jätame ka üksikhinded alles, et lehel saaks näidata, kes mida arvas.
      const raw = fix.criticScore ?? critics[song.id]?.skoor ?? null;
      if (typeof raw === 'number' && Number.isFinite(raw)) {
        song.criticScore = raw;
        song.criticScores = null;
      } else if (raw && typeof raw === 'object') {
        const entries = Object.entries(raw)
          .filter(([, v]) => typeof v === 'number' && Number.isFinite(v));
        song.criticScore = entries.length
          ? entries.reduce((sum, [, v]) => sum + v, 0) / entries.length
          : null;
        song.criticScores = entries.length ? Object.fromEntries(entries) : null;
      } else {
        song.criticScore = null;
        song.criticScores = null;
      }

      const q = encodeURIComponent(searchQuery(song));
      song.searchUrls = {
        spotify: `https://open.spotify.com/search/${q}`,
        youtube: `https://www.youtube.com/results?search_query=${q}`,
        bandcamp: `https://bandcamp.com/search?q=${q}`,
      };

      if (song.spotifyId) withSpotify++;
      if (song.youtubeId) withYoutube++;
    }
  }

  const totalSongs = episodes.reduce((n, e) => n + e.songs.length, 0);
  const emptyEpisodes = episodes.filter((e) => e.songs.length === 0);

  const out = {
    generatedAt: new Date().toISOString(),
    podcast: {
      id: PODCAST_ID,
      title: 'Muusikanõunikud',
      publisher: 'Delfi Meedia',
      hosts: ['Raul Saaremets', 'Valner Valme', 'Siim Nestor', 'Merit Maarits'],
      delfiUrl: DELFI_SHOW_URL,
      spotifyUrl: SPOTIFY_SHOW_URL,
      spotifyShowId: SPOTIFY_SHOW_ID,
      coverImageUrl: episodes[0]?.coverImageUrl ?? null,
    },
    stats: {
      episodes: episodes.length, songs: totalSongs, withSpotify, withYoutube,
      withCriticScore: episodes.reduce((n, e) => n + e.songs.filter((s) => s.criticScore != null).length, 0),
    },
    episodes,
  };

  await fs.writeFile(paths.episodes, JSON.stringify(out, null, 2) + '\n', 'utf8');
  await fs.writeFile(paths.songIds, JSON.stringify(newLock, null, 2) + '\n', 'utf8');

  // Frontendile serveeritav koopia — kompaktne, sest see läheb üle võrgu.
  await fs.mkdir(path.dirname(paths.webEpisodes), { recursive: true });
  await fs.writeFile(paths.webEpisodes, JSON.stringify(out), 'utf8');

  console.log(`${episodes.length} saadet, ${totalSongs} lugu → ${paths.episodes}`);
  console.log(`ID-d: ${stats.reusedContent} taaskasutatud (sisu), ` +
              `${stats.reusedPosition} taaskasutatud (asukoht), ${stats.minted} uut`);
  console.log(`Kuulamislingid: Spotify ${withSpotify}/${totalSongs}, YouTube ${withYoutube}/${totalSongs}`);
  console.log(`Nõunike skoor: ${out.stats.withCriticScore}/${totalSongs}`);

  if (emptyEpisodes.length) {
    console.log(`\nHOIATUS — ${emptyEpisodes.length} saadet ilma lugudeta:`);
    for (const e of emptyEpisodes) {
      console.log(`  - ${e.publishedAt.slice(0, 10)} ${e.title.slice(0, 58)}`);
    }
    console.log('  Lisa need data/overrides.json faili.');
  }
}

main().catch((err) => {
  console.error('build-data ebaõnnestus:', err.message);
  process.exit(1);
});
