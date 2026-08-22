import { useMemo, useState } from 'react';
import { useEpisodesFile } from '../useData';
import { EpisodeCard } from '../components/EpisodeCard';
import { PageState } from '../components/PageState';
import { normalize, searchHaystack } from '../data';

export function Episodes() {
  const { data, error } = useEpisodesFile();
  const [query, setQuery] = useState('');
  const [year, setYear] = useState<string>('koik');

  const years = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.episodes.map((e) => e.publishedAt.slice(0, 4)));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = normalize(query);
    return data.episodes.filter((e) => {
      if (year !== 'koik' && !e.publishedAt.startsWith(year)) return false;
      if (!q) return true;
      return searchHaystack(e).includes(q);
    });
  }, [data, query, year]);

  if (!data) return <PageState error={error} />;

  return (
    <div className="page">
      <section className="hero" style={{ paddingBottom: 0, borderBottom: 'none' }}>
        <p className="eyebrow">Kõik saated</p>
        <h1 style={{ fontSize: 34 }}>{data.stats.episodes} saadet, {data.stats.songs} lugu</h1>
      </section>

      <div className="toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Otsi artisti, loo või külalise järgi…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Otsi saadete seast"
        />
        <div className="chip-row">
          <button
            type="button"
            className={`chip${year === 'koik' ? ' is-active' : ''}`}
            onClick={() => setYear('koik')}
          >
            Kõik
          </button>
          {years.map((y) => (
            <button
              key={y}
              type="button"
              className={`chip${year === y ? ' is-active' : ''}`}
              onClick={() => setYear(y)}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      <p className="result-count">
        {filtered.length === data.episodes.length
          ? `${filtered.length} saadet`
          : `${filtered.length} saadet ${data.episodes.length}-st`}
      </p>

      {filtered.length === 0 ? (
        <div className="empty" style={{ marginTop: 20 }}>
          Otsingule „{query}” ei vastanud ükski saade.
        </div>
      ) : (
        <div className="episode-grid" style={{ marginTop: 18 }}>
          {filtered.map((episode) => (
            <EpisodeCard key={episode.guid} episode={episode} />
          ))}
        </div>
      )}
    </div>
  );
}
