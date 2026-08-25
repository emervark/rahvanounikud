import type { SongStats } from '../types';
import { DitherField } from './DitherField';

const fmt = (n: number) => n.toFixed(1).replace('.', ',');

/** Eesti keeles on ainsus 1, mitmus kõik muu: 1 hääl, 2 häält, 0 häält. */
const votes = (n: number) => (n === 1 ? '1 hääl' : `${n} häält`);

/** Vahe märgiga, eesti komaga: +1,1 / −0,2. Miinus on päris miinusmärk. */
function delta(a: number, b: number): string {
  const d = a - b;
  if (Math.abs(d) < 0.05) return '±0';
  return (d > 0 ? '+' : '−') + fmt(Math.abs(d));
}

/**
 * Koondhinde plaat: rahvas, sina, nõunikud.
 *
 * Kolm arvu kõrvuti on kogu lehe mõte — kas rahvas ja kriitikud on ühel nõul ja
 * kummale poole sina jääd. Puuduv arv ei jäta auku: rida lihtsalt puudub.
 *
 * Nõunike skoori podcasti kirjeldustes EI ole, see tuleb käsitsi failist
 * data/critic-scores.json. Kuni seda pole, on plaat kahene.
 */
export function ScorePlate({
  stats,
  criticScore,
  criticScores,
  myScore,
}: {
  stats: SongStats | undefined;
  criticScore?: number | null;
  criticScores?: Record<string, number> | null;
  myScore?: number;
}) {
  const hasVotes = stats !== undefined && stats.count > 0;
  const hasCritics = criticScore != null;

  return (
    <div className="plate">
      <DitherField strength={0.62} speed={0.05} pixel={3} colorNum={2} />
      <div className="plate__inner">
        <div className="plate__card">
          <div className={`plate__value${hasVotes ? '' : ' plate__value--empty'}`}>
            {hasVotes ? fmt(stats.average) : '—'}
          </div>
          <div className="mono">Rahva hääl</div>
          <div className="mono plate__votes">
            {hasVotes ? votes(stats.count) : 'hindamata'}
          </div>

          {myScore !== undefined && (
            <div className="plate__row">
              <b className="plate__mine">{myScore}</b>
              <span className="mono">Sinu hinne</span>
              {hasVotes && (
                <span className="mono plate__delta">{delta(myScore, stats.average)}</span>
              )}
            </div>
          )}

          {hasCritics && (
            <div className="plate__row">
              <b className="plate__critics">{fmt(criticScore)}</b>
              <span className="mono">Nõunikud</span>
              {hasVotes && (
                <span className="mono plate__delta">{delta(stats.average, criticScore)}</span>
              )}
            </div>
          )}

          {hasCritics && criticScores && (
            <div className="plate__breakdown mono">
              {Object.entries(criticScores).map(([name, score]) => (
                <span key={name}>
                  {name.split(' ')[0]} <b>{score}</b>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Kompaktne hinne pealkirja juures, ainult kitsale ekraanile.
 *
 * Laual istub plaat loo kõrval ja on kohe näha. Mobiilis lükkasid mängijad ta
 * pealkirjast ligi 700 pikslit allapoole — hinnet ei näinud enne, kui olid
 * kaks mängijat läbi kerinud. Siin on samad arvud ühel real, seal kus loo
 * nimi on. Plaat ise on kitsal ekraanil peidus, et sama arv ei seisaks kaks
 * korda.
 */
export function ScoreTag({
  stats,
  criticScore,
  myScore,
}: {
  stats: SongStats | undefined;
  criticScore?: number | null;
  myScore?: number;
}) {
  const hasVotes = stats !== undefined && stats.count > 0;

  return (
    <div className="scoretag">
      <span className="scoretag__cell">
        <b className={hasVotes ? undefined : 'scoretag__none'}>
          {hasVotes ? fmt(stats.average) : '—'}
        </b>
        <span className="mono">{hasVotes ? votes(stats.count) : 'hindamata'}</span>
      </span>

      {myScore !== undefined && (
        <span className="scoretag__cell">
          <b>{myScore}</b>
          <span className="mono">sina</span>
        </span>
      )}

      {criticScore != null && (
        <span className="scoretag__cell">
          <b className="scoretag__critics">{fmt(criticScore)}</b>
          <span className="mono">nõunikud</span>
        </span>
      )}
    </div>
  );
}

/** Kompaktne koondhinne edetabelis, kus dither-plaat oleks liiga lärmakas. */
export function CommunityScore({ stats }: { stats: SongStats | undefined }) {
  const hasVotes = stats !== undefined && stats.count > 0;
  if (!hasVotes) {
    return (
      <span className="chart-row__score">
        <b style={{ color: 'rgba(21,21,21,.35)' }}>—</b>
      </span>
    );
  }
  return (
    <span className="chart-row__score">
      <b>{fmt(stats.average)}</b>
      <span className="mono">{stats.count} h</span>
    </span>
  );
}

/** Nõunike skoor edetabelis koos vahega rahva hinnest. */
export function CriticScore({
  criticScore,
  stats,
}: {
  criticScore: number | null;
  stats: SongStats | undefined;
}) {
  if (criticScore == null) {
    return (
      <span className="chart-row__score chart-row__score--critic">
        <b style={{ color: 'rgba(21,21,21,.28)' }}>—</b>
      </span>
    );
  }
  const hasVotes = stats !== undefined && stats.count > 0;
  return (
    <span className="chart-row__score chart-row__score--critic">
      <b>{fmt(criticScore)}</b>
      {hasVotes && <span className="mono">{delta(stats.average, criticScore)}</span>}
    </span>
  );
}
