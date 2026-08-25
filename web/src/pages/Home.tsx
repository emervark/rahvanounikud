import { Link } from 'react-router-dom';
import { useEpisodesFile } from '../useData';
import { EpisodeCard } from '../components/EpisodeCard';
import { PageState } from '../components/PageState';
import { DitherField } from '../components/DitherField';
import { SectionTag } from '../components/SectionTag';
import { LatestComments } from '../components/LatestComments';
import { allSongs } from '../data';
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

  // Top 10: ainult hinnatud lood. Võrdse keskmise korral võidab see, millel
  // on rohkem hääli — üks kümme ei tohi edestada kümmet kaheksat.
  const top = allSongs(data)
    .filter(({ song }) => (stats[song.id]?.count ?? 0) > 0)
    .sort((a, b) => {
      const sa = stats[a.song.id];
      const sb = stats[b.song.id];
      return sb.average - sa.average || sb.count - sa.count;
    })
    .slice(0, 10);

  return (
    <>
      <div className="bento pad-block">
        {/* Kangelane: roosa paneel, kerge suur kiri, klahvinupp */}
        <section className="panel panel--pink hero-panel">
          <div className="hero-panel__top">
            <SectionTag label="Rahva hinnang" tone="pink" />
          </div>
          <h1 className="hero-panel__title">
            Maitse üle ei vaielda. Sellele pannakse number!
          </h1>
          <div className="hero-panel__foot">
            <Link className="key key--pink" to={`/saade/${data.episodes[0].guid}`}>
              Alusta värskeimast <span className="key__chip">1</span>
            </Link>
            <div className="hero-panel__stats mono">
              <span className="live">Rahvas hindab</span>
              <span>{data.stats.episodes} saadet</span>
              <span>{data.stats.songs} lugu</span>
              <span>sinu hinnatud: {ratedCount}</span>
            </div>
          </div>
        </section>

        {/* Top 10 püsti parempoolses veerus, kogu bento kõrguses */}
        <aside className="toprail">
          <div className="toprail__head">
            <SectionTag label="Rahva top" tone="gold" />
            <span className="mono">{top.length > 0 ? 'koondhinne' : '—'}</span>
          </div>

          {top.length === 0 ? (
            <div className="railcard">
              <span className="note-text">
                Top tekib siia siis, kui lugusid on hinnatud.
              </span>
            </div>
          ) : (
            top.map(({ song, episode }, i) => (
              <Link className="topitem" key={song.id} to={`/lugu/${song.id}`}>
                <span className={`topitem__rank rank-${i + 1}`}>{i + 1}</span>
                <span className="topitem__body">
                  <span className="topitem__title">{song.title}</span>
                  <span className="topitem__artist mono">
                    {song.artistsRaw} · {episode.publishedAt.slice(0, 4)}
                  </span>
                </span>
                <span className="topitem__score">
                  {stats[song.id].average.toFixed(1).replace('.', ',')}
                </span>
              </Link>
            ))
          )}

          {top.length > 0 && (
            <Link className="key toprail__all" to="/edetabel">
              Kogu edetabel <span className="key__chip">→</span>
            </Link>
          )}
        </aside>

        {/* Skaala: salveiroheline paneel joonlauaga */}
        <section className="panel panel--sage scale-panel">
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
        <section className="panel panel--gold gold-panel">
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
        <section className="panel panel--ink panel--flat dither-panel">
          <DitherField strength={0.55} speed={0.035} pixel={5} colorNum={2} />
        </section>

        {/* Vestlus üle bento laiuse. Tühjana ei renderdu. */}
        <LatestComments data={data} />
      </div>

      <div className="shead">
        <SectionTag label="Värsked saated" tone="sage" />
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
