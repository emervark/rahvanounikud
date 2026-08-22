import type { SongStats } from '../types';

/**
 * Koondhinne. Näitab alati ka hindajate arvu — üks kümme ei ole "10,0"
 * ja lugejal peab olema võimalik vahet teha.
 */
export function CommunityScore({ stats }: { stats: SongStats | undefined }) {
  const hasVotes = stats && stats.count > 0;

  return (
    <div className="score" title={hasVotes ? `${stats.count} hindajat` : 'Veel hindamata'}>
      <span className={`score__value${hasVotes ? '' : ' is-empty'}`}>
        {hasVotes ? stats.average.toFixed(1).replace('.', ',') : '—'}
      </span>
      <span className="score__label">
        {hasVotes ? `${stats.count} häält` : 'rahvas'}
      </span>
    </div>
  );
}

export function MyScore({ score }: { score: number | undefined }) {
  if (!score) return null;
  return (
    <div className="score score--mine" title="Sinu hinne">
      <span className="score__value">{score}</span>
      <span className="score__label">sinu</span>
    </div>
  );
}
