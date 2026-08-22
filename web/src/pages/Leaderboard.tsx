import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEpisodesFile } from '../useData';
import { PageState } from '../components/PageState';
import { CommunityScore, MyScore } from '../components/ScoreBadge';
import { allSongs, normalize } from '../data';
import { useRatings } from '../ratings';
import type { SongWithEpisode } from '../types';

type Sort = 'top' | 'bottom' | 'uued' | 'minu';

const SORTS: { key: Sort; label: string }[] = [
  { key: 'top', label: 'Kõrgeim koondhinne' },
  { key: 'bottom', label: 'Madalaim koondhinne' },
  { key: 'uued', label: 'Uuemad enne' },
  { key: 'minu', label: 'Minu hinnatud' },
];

export function Leaderboard() {
  const { data, error } = useEpisodesFile();
  const { stats, mine, hasCommunityScores } = useRatings();
  const [sort, setSort] = useState<Sort>(hasCommunityScores ? 'top' : 'uued');
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    if (!data) return [];
    const q = normalize(query);

    let list: SongWithEpisode[] = allSongs(data);
    if (q) {
      list = list.filter(({ song }) =>
        normalize(`${song.artistsRaw} ${song.title}`).includes(q));
    }
    if (sort === 'minu') {
      list = list.filter(({ song }) => mine[song.id] !== undefined);
    }

    const score = (id: string) => stats[id]?.average ?? null;

    return [...list].sort((a, b) => {
      if (sort === 'uued') {
        return b.episode.publishedAt.localeCompare(a.episode.publishedAt);
      }
      if (sort === 'minu') {
        return (mine[b.song.id] ?? 0) - (mine[a.song.id] ?? 0);
      }
      const sa = score(a.song.id);
      const sb = score(b.song.id);
      // Hindamata lood lõppu, mõlemat pidi sorteerides
      if (sa === null && sb === null) {
        return b.episode.publishedAt.localeCompare(a.episode.publishedAt);
      }
      if (sa === null) return 1;
      if (sb === null) return -1;
      return sort === 'top' ? sb - sa : sa - sb;
    });
  }, [data, query, sort, stats, mine]);

  if (!data) return <PageState error={error} />;

  return (
    <div className="page">
      <section className="hero" style={{ paddingBottom: 0, borderBottom: 'none' }}>
        <p className="eyebrow">Edetabel</p>
        <h1 style={{ fontSize: 34 }}>Kõik {data.stats.songs} lugu</h1>
      </section>

      {!hasCommunityScores && (
        <p className="player-hint" style={{ marginTop: 16 }}>
          Koondhinded ilmuvad siia, kui hindamine läheb ühiskasutusse. Praegu hoiab
          leht sinu hindeid ainult selles brauseris.
        </p>
      )}

      <div className="toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Otsi artisti või loo järgi…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Otsi lugude seast"
        />
        <div className="chip-row">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`chip${sort === s.key ? ' is-active' : ''}`}
              onClick={() => setSort(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <p className="result-count">{rows.length} lugu</p>

      {rows.length === 0 ? (
        <div className="empty" style={{ marginTop: 20 }}>
          {sort === 'minu'
            ? 'Sa pole veel ühtegi lugu hinnanud. Ava mõni saade ja alusta.'
            : `Otsingule „${query}” ei vastanud ükski lugu.`}
        </div>
      ) : (
        <div className="chart-list" style={{ marginTop: 14 }}>
          {rows.map(({ song, episode }, i) => (
            <Link className="chart-row" key={song.id} to={`/saade/${episode.guid}`}>
              <span className="chart-row__rank">{i + 1}</span>
              <span className="chart-row__main">
                <span className="chart-row__title">{song.title}</span>
                <span className="chart-row__sub">
                  {song.artistsRaw} · {episode.publishedAt.slice(0, 10)}
                </span>
              </span>
              <span className="chart-row__scores">
                <MyScore score={mine[song.id]} />
                <CommunityScore stats={stats[song.id]} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
