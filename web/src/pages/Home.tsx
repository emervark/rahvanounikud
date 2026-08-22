import { Link } from 'react-router-dom';
import { useEpisodesFile } from '../useData';
import { EpisodeCard } from '../components/EpisodeCard';
import { PageState } from '../components/PageState';
import { useRatings } from '../ratings';

export function Home() {
  const { data, error } = useEpisodesFile();
  const { ratedCount } = useRatings();

  if (!data) return <PageState error={error} />;

  const latest = data.episodes.slice(0, 6);

  return (
    <>
      <section className="hero page">
        <p className="eyebrow">Muusikanõunikud · kuulaja hinnang</p>
        <h1>
          Kriitikud on oma sõna öelnud. Nüüd ütle <em>sina</em>.
        </h1>
        <p>
          Igas „Muusikanõunike” saates kuulavad kriitikud läbi neli uut lugu ja
          annavad neile hinde. Siin saad samad lood ise üle kuulata ja hinnata
          skaalal 1–10. Kõigi kuulajate hinnetest sünnib Rahvanõunikud koondhinne.
        </p>
        <div className="hero-actions">
          <Link className="button button--primary" to={`/saade/${data.episodes[0].guid}`}>
            Alusta värskeimast saatest
          </Link>
          <Link className="button button--ghost" to="/edetabel">
            Vaata edetabelit
          </Link>
        </div>
      </section>

      <div className="page">
        <div className="stat-row">
          <div>
            <b>{data.stats.episodes}</b>
            <span>saadet</span>
          </div>
          <div>
            <b>{data.stats.songs}</b>
            <span>hinnatavat lugu</span>
          </div>
          <div>
            <b>{ratedCount}</b>
            <span>sinu hinnatud</span>
          </div>
        </div>

        <section className="home-section">
          <div className="section-head">
            <h2>Värsked saated</h2>
            <Link to="/saated">Kõik {data.stats.episodes} saadet →</Link>
          </div>
          <div className="episode-grid">
            {latest.map((episode) => (
              <EpisodeCard key={episode.guid} episode={episode} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
