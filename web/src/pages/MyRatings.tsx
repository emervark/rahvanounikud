import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useEpisodesFile } from '../useData';
import { PageState } from '../components/PageState';
import { CommunityScore, MyScore } from '../components/ScoreBadge';
import { allSongs, formatDate } from '../data';
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
    <div className="page">
      <section className="hero" style={{ paddingBottom: 0, borderBottom: 'none' }}>
        <p className="eyebrow">Minu hinded</p>
        <h1 style={{ fontSize: 34 }}>
          {rated.length === 0 ? 'Veel hindamata' : `${rated.length} hinnatud lugu`}
        </h1>
      </section>

      {rated.length === 0 ? (
        <div className="empty" style={{ marginTop: 28 }}>
          <p>Sa pole veel ühtegi lugu hinnanud.</p>
          <Link className="button button--primary" to={`/saade/${data.episodes[0].guid}`}>
            Alusta värskeimast saatest
          </Link>
        </div>
      ) : (
        <>
          <div className="stat-row">
            <div>
              <b>{rated.length}</b>
              <span>hinnatud lugu</span>
            </div>
            <div>
              <b>{average.toFixed(1).replace('.', ',')}</b>
              <span>sinu keskmine hinne</span>
            </div>
            <div>
              <b>{Math.round((rated.length / data.stats.songs) * 100)}%</b>
              <span>kõigist lugudest</span>
            </div>
          </div>

          {!hasCommunityScores && (
            <p className="player-hint" style={{ marginTop: 16 }}>
              Hinded on praegu salvestatud ainult sellesse brauserisse. Kui sa ajaloo
              kustutad või teise seadme võtad, siis neid seal ei ole.
            </p>
          )}

          {hasCommunityScores && loginAvailable && !isLoggedIn && (
            <p className="player-hint" style={{ marginTop: 16 }}>
              Sinu hinded on seotud selle brauseriga. Kui logid Google'iga sisse,
              lähevad juba antud hinded kontoga kaasa ja on olemas ka teises seadmes.{' '}
              <a href="/api/auth/google" style={{ color: 'var(--accent)' }}>Logi sisse →</a>
            </p>
          )}

          <div className="chart-list" style={{ marginTop: 20 }}>
            {rated.map(({ song, episode }, i) => (
              <Link className="chart-row" key={song.id} to={`/saade/${episode.guid}`}>
                <span className="chart-row__rank">{i + 1}</span>
                <span className="chart-row__main">
                  <span className="chart-row__title">{song.title}</span>
                  <span className="chart-row__sub">
                    {song.artistsRaw} · {formatDate(episode.publishedAt)}
                  </span>
                </span>
                <span className="chart-row__scores">
                  <MyScore score={mine[song.id]} />
                  <CommunityScore stats={stats[song.id]} />
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
