import type { SongStats } from '../types';
import { DitherField } from './DitherField';

const fmt = (n: number) => n.toFixed(1).replace('.', ',');

/** Eesti keeles on ainsus 1, mitmus kõik muu: 1 hääl, 2 häält, 0 häält. */
const votes = (n: number) => (n === 1 ? '1 hääl' : `${n} häält`);

/**
 * Koondhinde plaat.
 *
 * Näitab alati ka hindajate arvu — üks kümme ei ole „10,0" ja lugejal peab
 * olema võimalik vahet teha. Kriitikute skoor kuvatakse ainult siis, kui see
 * on olemas: podcasti kirjeldustes numbrilisi hindeid ei ole, need saab ainult
 * käsitsi sisestada.
 */
export function ScorePlate({
  stats,
  criticScore,
}: {
  stats: SongStats | undefined;
  criticScore?: number | null;
}) {
  const hasVotes = stats !== undefined && stats.count > 0;

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

          {criticScore != null && (
            <div className="plate__critics">
              <b>{fmt(criticScore)}</b>
              <div className="mono">Nõunike skoor</div>
            </div>
          )}
        </div>
      </div>
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
