import { useMemo, useState } from 'react';
import { useEpisodesFile } from '../useData';
import { EpisodeCard } from '../components/EpisodeCard';
import { PageState } from '../components/PageState';
import { normalize, searchHaystack } from '../data';

export function Episodes() {
  const { data, error } = useEpisodesFile();
  const [query, setQuery] = useState('');
  const [year, setYear] = useState('koik');

  const years = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.episodes.map((e) => e.publishedAt.slice(0, 4)))]
      .sort((a, b) => b.localeCompare(a));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = normalize(query);
    return data.episodes
      .map((episode, i) => ({ episode, number: data.episodes.length - i }))
      .filter(({ episode }) => {
        if (year !== 'koik' && !episode.publishedAt.startsWith(year)) return false;
        return !q || searchHaystack(episode).includes(q);
      });
  }, [data, query, year]);

  if (!data) return <PageState error={error} />;

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="mono" style={{ marginBottom: 14 }}>
            Kõik saated · {data.stats.songs} hinnatavat lugu
          </div>
          <h1>{data.stats.episodes} saadet</h1>
        </div>
      </div>

      <div className="toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Otsi artisti, loo või külalise järgi…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Otsi saadete seast"
        />
        <div className="seg">
          <button type="button" className={year === 'koik' ? 'on' : ''} onClick={() => setYear('koik')}>
            Kõik
          </button>
          {years.map((y) => (
            <button key={y} type="button" className={year === y ? 'on' : ''} onClick={() => setYear(y)}>
              {y}
            </button>
          ))}
        </div>
      </div>

      <p className="result-count mono">
        {filtered.length === data.episodes.length
          ? `${filtered.length} saadet`
          : `${filtered.length} saadet ${data.episodes.length}-st`}
      </p>

      {filtered.length === 0 ? (
        <div className="empty">
          <p className="mono">Otsingule „{query}” ei vastanud ükski saade.</p>
        </div>
      ) : (
        filtered.map(({ episode, number }, i) => (
          <EpisodeCard
            key={episode.guid}
            episode={episode}
            number={number}
            last={i === filtered.length - 1}
          />
        ))
      )}
    </>
  );
}
