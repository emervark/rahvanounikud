import { useState } from 'react';
import { MAX_SCORE, MIN_SCORE, useRatings } from '../ratings';

const SCORES = Array.from({ length: MAX_SCORE - MIN_SCORE + 1 }, (_, i) => MIN_SCORE + i);

/**
 * 1–10 skaala.
 *
 * Nupud täituvad valitud hindeni ditheritud mustriga, nii et hinne on loetav
 * ka numbrit lugemata — riba pikkus ongi hinne. Muster on sama, mis lehe
 * taustaväljal, nii et skaala kuulub visuaalselt sinnasamma.
 */
export function RatingBar({ songId, label }: { songId: string; label: string }) {
  const { mine, rate, clearRating } = useRatings();
  const [hovered, setHovered] = useState<number | null>(null);

  const current = mine[songId];
  const shown = hovered ?? current;

  return (
    <div className="rating">
      <div className="rating__label mono">
        <span>{current ? `Sinu hinne: ${current}/10` : 'Anna oma hinne'}</span>
        {current && (
          <button type="button" className="rating__clear mono" onClick={() => clearRating(songId)}>
            eemalda
          </button>
        )}
      </div>

      <div
        className="rating__scale"
        role="radiogroup"
        aria-label={`Hinda lugu ${label} skaalal 1–10`}
        onMouseLeave={() => setHovered(null)}
      >
        {SCORES.map((score) => (
          <button
            key={score}
            type="button"
            role="radio"
            aria-checked={current === score}
            aria-label={`${score} / 10`}
            className={
              'rb'
              + (shown !== undefined && score <= shown ? ' fill' : '')
              + (current === score ? ' on' : '')
            }
            onMouseEnter={() => setHovered(score)}
            onFocus={() => setHovered(score)}
            onBlur={() => setHovered(null)}
            onClick={() => rate(songId, score)}
          >
            {score}
          </button>
        ))}
      </div>
    </div>
  );
}
