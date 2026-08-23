import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useEpisodesFile } from '../useData';
import { PageState } from '../components/PageState';
import { CommunityScore } from '../components/ScoreBadge';
import { allSongs } from '../data';
import { useRatings } from '../ratings';

export function MyRatings() {
  const { data, error } = useEpisodesFile();
  const { mine, stats, hasCommunityScores, isLoggedIn, loginAvailable } = useRatings();

  const rated = useMemo(() => {
    if (!data) return [];
    return allSongs(data)
      .filter(({ song }) => mine[song.id] !== undefined)
      .sort((a, b) => mine[b.song.id] - mine[a.song.id]);
  }, [data, mine]);

  const average = rated.length
    ? rated.reduce((sum, { song }) => sum + mine[song.id], 0) / rated.length
    : 0;

  if (!data) return <PageState error={error} />;

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="mono" style={{ marginBottom: 14 }}>Minu hinded</div>
          <h1>{rated.length === 0 ? 'Veel hindamata' : `${rated.length} hinnatud lugu`}</h1>
        </div>
      </div>

      {rated.length === 0 ? (
        <div className="empty">
          <p className="mono">Sa pole veel ühtegi lugu hinnanud.</p>
          <Link className="btn solid" to={`/saade/${data.episodes[0].guid}`}>
            Alusta värskeimast saatest <span className="arw">→</span>
          </Link>
        </div>
      ) : (
        <>
          <div className="stat-row">
            <div>
              <b>{rated.length}</b>
              <span className="mono">hinnatud lugu</span>
            </div>
            <div>
              <b>{average.toFixed(1).replace('.', ',')}</b>
              <span className="mono">sinu keskmine</span>
            </div>
            <div>
              <b>{Math.round((rated.length / data.stats.songs) * 100)}%</b>
              <span className="mono">kõigist lugudest</span>
            </div>
          </div>

          {!hasCommunityScores && (
            <p className="mono" style={{ padding: '16px var(--pad)' }}>
              Hinded on praegu salvestatud ainult sellesse brauserisse.
            </p>
          )}

          {hasCommunityScores && loginAvailable && !isLoggedIn && (
            <p className="mono" style={{ padding: '16px var(--pad)', lineHeight: 1.8 }}>
              Sinu hinded on seotud selle brauseriga. Kui logid Google'iga sisse,
              lähevad juba antud hinded kontoga kaasa ja on olemas ka teises seadmes.{' '}
              <a href="/api/auth/google" style={{ color: 'var(--accent-ink)' }}>Logi sisse →</a>
            </p>
          )}

          <div className="chart-head mono">
            <span>Sinu</span>
            <span>Lugu / artist</span>
            <span />
            <span>Rahva hääl</span>
            <span />
          </div>

          {rated.map(({ song, episode }) => (
            <Link className="chart-row" key={song.id} to={`/saade/${episode.guid}`}>
              <span className="chart-row__rank top">{mine[song.id]}</span>
              <span style={{ minWidth: 0 }}>
                <span className="chart-row__title">{song.title}</span>
                <span className="chart-row__sub mono">
                  {song.artistsRaw} · {episode.publishedAt.slice(0, 10)}
                </span>
              </span>
              <span className="chart-row__mine" />
              <CommunityScore stats={stats[song.id]} />
              <span className="go">→</span>
            </Link>
          ))}
        </>
      )}
    </>
  );
}
