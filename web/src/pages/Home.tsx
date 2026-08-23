import { Link } from 'react-router-dom';
import { useEpisodesFile } from '../useData';
import { EpisodeCard } from '../components/EpisodeCard';
import { PageState } from '../components/PageState';
import { DitherField } from '../components/DitherField';
import { SectionTag } from '../components/SectionTag';
import { useRatings } from '../ratings';

/**
 * Hinnete jaotus mõõteskaalana.
 *
 * Motiiv on joonlaud: 1–10 on jaotus ja piigid näitavad, kuhu rahva hinded
 * kogunevad. Kui hindeid veel ei ole, jääb joon tasaseks — see on aus pilt
 * tühjast skaalast, mitte kaunistus.
 */
function ScaleLine({ stats }: { stats: Record<string, { average: number }> }) {
  const buckets = new Array(10).fill(0);
  for (const s of Object.values(stats)) {
    const i = Math.min(9, Math.max(0, Math.round(s.average) - 1));
    buckets[i]++;
  }
  const peak = Math.max(1, ...buckets);

  const step = 1000 / 10;
  let d = 'M0 88';
  buckets.forEach((count, i) => {
    const x = step * i + step / 2;
    const h = 88 - (count / peak) * 74;
    d += ` L${(x - 16).toFixed(0)} 88 L${x.toFixed(0)} ${h.toFixed(0)} L${(x + 16).toFixed(0)} 88`;
  });
  d += ' L1000 88';

  return (
    <svg viewBox="0 0 1000 118" className="ruler" role="img"
         aria-label="Rahva hinnete jaotus skaalal 1 kuni 10">
      <path className="trace" d={d} fill="none" stroke="var(--ink)" strokeWidth="3" />
      <line x1="0" y1="96" x2="1000" y2="96" stroke="var(--ink)" strokeWidth="2" />
      <g stroke="var(--ink)" strokeWidth="1.5">
        {Array.from({ length: 41 }, (_, i) => {
          const x = (1000 / 40) * i;
          const major = i % 4 === 0;
          return <line key={i} x1={x} y1="96" x2={x} y2={major ? 112 : 105} />;
        })}
      </g>
    </svg>
  );
}

export function Home() {
  const { data, error } = useEpisodesFile();
  const { ratedCount, stats } = useRatings();

  if (!data) return <PageState error={error} />;

  const latest = data.episodes.slice(0, 4);
  const total = data.episodes.length;
  const rated = Object.keys(stats).length;

  return (
    <>
      <div className="bento pad-block">
        {/* Kangelane: roosa paneel, kerge suur kiri, klahvinupp */}
        <section className="panel panel--pink span-8 hero-panel">
          <div className="hero-panel__top">
            <SectionTag num="01" label="Rahva hinnang" />
            <span className="bignum">01.1</span>
          </div>
          <h1 className="hero-panel__title">
            Kriitikud on oma sõna öelnud. Nüüd ütle sina.
          </h1>
          <Link className="key key--pink hero-panel__cta" to={`/saade/${data.episodes[0].guid}`}>
            Alusta värskeimast <span className="key__chip">1</span>
          </Link>
        </section>

        {/* Skaala: salveiroheline paneel joonlauaga */}
        <section className="panel panel--sage span-4 scale-panel">
          <div className="scale-panel__head mono">
            <span>Hinnete jaotus</span>
            <span>{rated > 0 ? `${rated} hinnatud lugu` : 'veel hindamata'}</span>
          </div>
          <ScaleLine stats={stats} />
          <div className="scale-panel__ticks mono">
            <span>1</span><span>5</span><span>10</span>
          </div>
        </section>

        {/* Selgitus: ooker paneel */}
        <section className="panel panel--gold span-5">
          <p className="lead">
            Igas „Muusikanõunike” saates kuulavad kriitikud läbi uued lood ja
            annavad neile hinde. Siin saad samad lood ise üle kuulata, hinnata
            skaalal 1–10 ja kommenteerida. Kõigi kuulajate hinnetest sünnib
            Rahvanõunikud koondhinne.
          </p>
          <Link className="key key--gold" to="/edetabel">
            Vaata edetabelit <span className="key__chip">2</span>
          </Link>
        </section>

        {/* 1-bitine väli: must paneel */}
        <section className="panel panel--ink panel--flat span-4 dither-panel">
          <DitherField strength={0.55} speed={0.035} pixel={5} colorNum={2} />
        </section>

        {/* Külgriba: statistika ja teated */}
        <aside className="rail span-3">
          <div className="railcard railstat">
            <b>{data.stats.episodes}</b>
            <span className="mono">saadet</span>
          </div>
          <div className="railcard railstat">
            <b>{data.stats.songs}</b>
            <span className="mono">lugu</span>
          </div>
          <div className="railcard railstat">
            <b>{ratedCount}</b>
            <span className="mono">sinu hinnatud</span>
          </div>
          <Link className="railcard" to="/saated">
            <span className="railcard__chip" style={{ background: 'var(--sage)' }}>S</span>
            <span className="railcard__body">
              <span className="railcard__title">Kõik saated</span>
              <span className="railcard__note">Otsi artisti või loo järgi</span>
            </span>
            <span className="railcard__go">↗</span>
          </Link>
          <Link className="railcard" to="/minu-hinded">
            <span className="railcard__chip" style={{ background: 'var(--lav)' }}>M</span>
            <span className="railcard__body">
              <span className="railcard__title">Minu hinded</span>
              <span className="railcard__note">Sinu hinded rahva omade kõrval</span>
            </span>
            <span className="railcard__go">↗</span>
          </Link>
        </aside>
      </div>

      <div className="shead">
        <SectionTag num="02" label="Värsked saated" />
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

      <div className="home-cta" style={{ paddingBlock: '22px 44px' }}>
        <Link className="key" to="/saated">
          Kõik {total} saadet <span className="key__chip">→</span>
        </Link>
      </div>
    </>
  );
}
