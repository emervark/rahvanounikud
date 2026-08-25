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
 * Koondhinde plaat: rahvas ja sina.
 *
 * Algne plaan oli kolm arvu kõrvuti — rahvas, sina, nõunikud. Nõunike
 * hinded jäid siit välja, sest neid ei ole kusagilt võtta: podcasti
 * kirjeldustes on ainult „Milline lugu võitis? Kuula podcastist!” ja
 * kriitikud ise numbreid ei talletanud. Kõrvuti seisis seega alaline
 * kriips, mis lübas välja midagi, mida ei tulnud.
 *
 * Andmemudelis on criticScore alles, nii et võrdluse saab tagasi tuua, kui
 * numbrid kunagi tekivad.
 */
export function ScorePlate({
  stats,
  myScore,
}: {
  stats: SongStats | undefined;
  myScore?: number;
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

          {myScore !== undefined && (
            <div className="plate__row">
              <b className="plate__mine">{myScore}</b>
              <span className="mono">Sinu hinne</span>
              {hasVotes && (
                <span className="mono plate__delta">{delta(myScore, stats.average)}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Kompaktne hinne pealkirja kõrval, ainult kitsale ekraanile.
 *
 * Laual istub plaat loo kõrval ja on kohe näha. Mobiilis lükkasid mängijad ta
 * lehe lõppu — hinnet ei näinud enne, kui olid mõlemad mängijad läbi
 * kerinud. Siin on sama asi väiksena, pealkirja kõrval.
 *
 * Raam on sama motiiv mis plaadil, aga CSS-i malelaud, mitte WebGL. Plaat on
 * mobiilis peidus, mitte eemaldatud, ja tema dither-lõuend jookseb edasi;
 * teine lõuend iga loo kohta tähendaks saate lehel kaheksat WebGL-konteksti,
 * mis on juba brauseri piiri lähedal. Staatiline muster näeb selles suuruses
 * niikuinii sama välja.
 */
export function ScoreTag({
  stats,
  myScore,
}: {
  stats: SongStats | undefined;
  myScore?: number;
}) {
  const hasVotes = stats !== undefined && stats.count > 0;

  return (
    <div className="scoretag">
      <div className="scoretag__card">
        <div className={`scoretag__value${hasVotes ? '' : ' scoretag__value--empty'}`}>
          {hasVotes ? fmt(stats.average) : '—'}
        </div>
        <div className="mono scoretag__label">Rahvas</div>
        <div className="mono scoretag__votes">
          {hasVotes ? votes(stats.count) : 'hindamata'}
        </div>

        {myScore !== undefined && (
          <div className="mono scoretag__row">
            <span>Sina</span><b>{myScore}</b>
          </div>
        )}
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
