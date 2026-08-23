import { Link } from 'react-router-dom';
import { useEpisodesFile } from '../useData';
import { EpisodeCard } from '../components/EpisodeCard';
import { PageState } from '../components/PageState';
import { DitherField } from '../components/DitherField';
import { useRatings } from '../ratings';

/**
 * Hinnete jaotus sagedusjoonena.
 *
 * Motiiv on raadioskaala: 1–10 on sagedused ja piigid näitavad, kuhu rahva
 * hinded kogunevad. Kui hindeid veel ei ole, jääb joon tasaseks — see on aus
 * pilt tühjast skaalast, mitte kaunistus.
 */
function ScaleLine({ stats }: { stats: Record<string, { average: number }> }) {
  const buckets = new Array(10).fill(0);
  for (const s of Object.values(stats)) {
    const i = Math.min(9, Math.max(0, Math.round(s.average) - 1));
    buckets[i]++;
  }
  const peak = Math.max(1, ...buckets);

  // Iga sagedus saab piigi, mille kõrgus on selle hinde osakaal.
  const step = 1150 / 10;
  let d = 'M0 50';
  buckets.forEach((count, i) => {
    const x = step * i + step / 2;
    const h = 50 - (count / peak) * 46;
    d += ` L${(x - 18).toFixed(0)} 50 L${x.toFixed(0)} ${h.toFixed(0)} L${(x + 18).toFixed(0)} 50`;
  });
  d += ' L1150 50';

  return (
    <div className="scale">
      <svg viewBox="0 0 1150 76" role="img" aria-label="Rahva hinnete jaotus skaalal 1 kuni 10">
        <line x1="0" y1="58" x2="1150" y2="58" stroke="var(--ink)" strokeWidth="2" />
        <path className="trace" d={d} fill="none" stroke="var(--accent-ink)" strokeWidth="3" />
        <g stroke="var(--ink)" strokeWidth="2">
          {Array.from({ length: 10 }, (_, i) => {
            const x = i === 0 ? 1 : Math.round((1148 / 9) * i);
            const long = i === 0 || i === 9;
            return <line key={i} x1={x} y1="58" x2={x} y2={long ? 72 : 68} />;
          })}
        </g>
      </svg>
      <div className="scale__ticks mono">
        {Array.from({ length: 10 }, (_, i) => <span key={i}>{i + 1}</span>)}
      </div>
    </div>
  );
}

export function Home() {
  const { data, error } = useEpisodesFile();
  const { ratedCount, stats } = useRatings();

  if (!data) return <PageState error={error} />;

  const latest = data.episodes.slice(0, 4);
  const total = data.episodes.length;

  return (
    <>
      <section className="hero">
        <DitherField strength={0.3} speed={0.03} pixel={2} colorNum={3} />
        <div className="hero__inner">
          <div className="mono stamp rise">
            Hindajate register — Muusikanõunikud · V1.0
          </div>
          <h1 className="rise" style={{ animationDelay: '.05s' }}>
            Kriitikud on oma sõna öelnud. Nüüd ütle <span className="mark">sina</span>.
          </h1>
          <p className="hero__lead rise" style={{ animationDelay: '.12s' }}>
            Igas „Muusikanõunike” saates kuulavad kriitikud läbi neli uut lugu ja
            annavad neile hinde. Siin saad samad lood ise üle kuulata ja hinnata
            skaalal 1–10. Kõigi kuulajate hinnetest sünnib Rahvanõunikud koondhinne.
          </p>
          <div className="hero__stats mono rise" style={{ animationDelay: '.18s' }}>
            <span className="live">Rahvas hindab</span>
            <span>Saateid: <b>{data.stats.episodes}</b></span>
            <span>Lugusid: <b>{data.stats.songs}</b></span>
            <span>Sinu hinnatud: <b>{ratedCount}</b></span>
          </div>
          <div className="hero__actions rise" style={{ animationDelay: '.24s' }}>
            <Link className="btn solid" to={`/saade/${data.episodes[0].guid}`}>
              Alusta värskeimast saatest <span className="arw">→</span>
            </Link>
            <Link className="btn" to="/edetabel">Vaata edetabelit</Link>
          </div>
        </div>
      </section>

      <ScaleLine stats={stats} />

      <div className="shead">
        <span className="idx">01</span>
        <h2>Värsked saated</h2>
        <span className="mono note">Uuemad enne</span>
      </div>

      {latest.map((episode, i) => (
        <EpisodeCard
          key={episode.guid}
          episode={episode}
          number={total - i}
          last={i === latest.length - 1}
        />
      ))}

      <div className="home-cta" style={{ paddingBlock: '22px 40px' }}>
        <Link className="btn" to="/saated">
          Kõik {total} saadet <span className="arw">→</span>
        </Link>
      </div>
    </>
  );
}
