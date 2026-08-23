import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEpisodesFile } from '../useData';
import { PageState } from '../components/PageState';
import { CommunityScore, CriticScore } from '../components/ScoreBadge';
import { allSongs, normalize } from '../data';
import { useCommentCounts } from '../comments';
import { useRatings } from '../ratings';
import type { SongWithEpisode } from '../types';

type Sort = 'top' | 'bottom' | 'uued' | 'minu';

const SORTS: { key: Sort; label: string }[] = [
  { key: 'top', label: 'Kõrgeim' },
  { key: 'bottom', label: 'Madalaim' },
  { key: 'uued', label: 'Uuemad enne' },
  { key: 'minu', label: 'Minu hinnatud' },
];

export function Leaderboard() {
  const { data, error } = useEpisodesFile();
  const { stats, mine, hasCommunityScores } = useRatings();
  const [sort, setSort] = useState<Sort>('top');
  const [query, setQuery] = useState('');
  const commentCounts = useCommentCounts();

  const episodeNumber = useMemo(() => {
    const map = new Map<string, number>();
    if (data) data.episodes.forEach((e, i) => map.set(e.guid, data.episodes.length - i));
    return map;
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    const q = normalize(query);

    let list: SongWithEpisode[] = allSongs(data);
    if (q) {
      list = list.filter(({ song }) => normalize(`${song.artistsRaw} ${song.title}`).includes(q));
    }
    if (sort === 'minu') list = list.filter(({ song }) => mine[song.id] !== undefined);

    const score = (id: string) => stats[id]?.average ?? null;

    return [...list].sort((a, b) => {
      if (sort === 'uued') return b.episode.publishedAt.localeCompare(a.episode.publishedAt);
      if (sort === 'minu') return (mine[b.song.id] ?? 0) - (mine[a.song.id] ?? 0);

      const sa = score(a.song.id);
      const sb = score(b.song.id);
      // Hindamata lood lõppu, mõlemat pidi sorteerides
      if (sa === null && sb === null) return b.episode.publishedAt.localeCompare(a.episode.publishedAt);
      if (sa === null) return 1;
      if (sb === null) return -1;
      return sort === 'top' ? sb - sa : sa - sb;
    });
  }, [data, query, sort, stats, mine]);

  if (!data) return <PageState error={error} />;

  const totalVotes = Object.values(stats).reduce((n, s) => n + s.count, 0);
  // Nõunike veerg on alati nähtav, ka enne kui skoorid sisestatud on: veerg
  // näitab, et see võrdlus on osa tabelist. Ilma skoorita lahtris on kriips.
  const criticsFilled = data.stats.withCriticScore;
  const ranked = sort === 'top' || sort === 'bottom';

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="mono" style={{ marginBottom: 14 }}>Edetabel · kõik hinnatavad lood</div>
          <h1>Kõik {data.stats.songs} lugu</h1>
        </div>
        {hasCommunityScores && totalVotes > 0 && (
          <div className="mono live" style={{ paddingBottom: 6 }}>
            {totalVotes.toLocaleString('et-EE')} häält antud
          </div>
        )}
      </div>

      <div className="toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Otsi artisti või loo järgi…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Otsi lugude seast"
        />
        <div className="seg">
          {SORTS.map((s) => (
            <button key={s.key} type="button" className={sort === s.key ? 'on' : ''} onClick={() => setSort(s.key)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-head mono chart-head--critics">
        <span>Koht</span>
        <span>Lugu / artist</span>
        <span>Sinu</span>
        <span>Rahva hääl</span>
        <span>Nõunikud</span>
        <span />
      </div>

      {criticsFilled === 0 && (
        <p className="note-text critics-note">
          Nõunike skoore ei ole podcasti kirjeldustes — need sisestatakse käsitsi
          saateid kuulates. Veerg täitub sedamööda, kuidas hindeid lisandub.
        </p>
      )}

      {rows.length === 0 ? (
        <div className="empty">
          <p className="mono">
            {sort === 'minu'
              ? 'Sa pole veel ühtegi lugu hinnanud. Ava mõni saade ja alusta.'
              : `Otsingule „${query}” ei vastanud ükski lugu.`}
          </p>
        </div>
      ) : (
        rows.map(({ song, episode }, i) => {
          // Esikolmik saab punase ja kasvava numbri — edetabel, mitte andmetabel.
          const rankClass = ranked && i < 3 ? ` top top${i + 1}` : '';
          return (
            <Link className="chart-row chart-row--critics" key={song.id} to={`/lugu/${song.id}`}>
              <span className={`chart-row__rank${rankClass}`}>{i + 1}</span>
              <span style={{ minWidth: 0 }}>
                <span className="chart-row__title">{song.title}</span>
                <span className="chart-row__sub mono">
                  {song.artistsRaw} · saade nr {episodeNumber.get(episode.guid)} ·{' '}
                  {episode.publishedAt.slice(0, 4)}
                  {commentCounts[song.id] > 0 && ` · ${commentCounts[song.id]} kommentaari`}
                </span>
              </span>
              <span className="chart-row__mine">{mine[song.id] ?? ''}</span>
              <CommunityScore stats={stats[song.id]} />
              <CriticScore criticScore={song.criticScore} stats={stats[song.id]} />
              <span className="go">→</span>
            </Link>
          );
        })
      )}
    </>
  );
}
