// Kinnine helimängija lehe allservas.
//
// Mõte on kogu projekti oma: paned saate mängima ja kerid samal ajal lugude vahel,
// hindad koos kriitikutega. Seepärast ei ela mängija saate lehel, vaid rakenduse
// juurtasandil — nii ei katke kuulamine, kui vahepeal edetabelisse vaadata.

import {
  createContext, useCallback, useContext, useMemo, useState, type ReactNode,
} from 'react';
import type { Episode } from './types';

interface PlayerContextValue {
  current: Episode | null;
  play(episode: Episode): void;
  stop(): void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Episode | null>(null);

  const play = useCallback((episode: Episode) => setCurrent(episode), []);
  const stop = useCallback(() => setCurrent(null), []);

  const value = useMemo(() => ({ current, play, stop }), [current, play, stop]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer peab olema PlayerProvider sees');
  return ctx;
}

export function StickyPlayer() {
  const { current, stop } = usePlayer();
  if (!current?.audioUrl) return null;

  return (
    <div className="sticky-player">
      <div className="page sticky-player__inner">
        <div className="sticky-player__title">
          <b>{current.title}</b>
          Muusikanõunikud
        </div>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio src={current.audioUrl} controls autoPlay preload="none" />
        <button
          type="button"
          className="sticky-player__close"
          onClick={stop}
          aria-label="Sulge mängija"
        >
          ×
        </button>
      </div>
    </div>
  );
}
