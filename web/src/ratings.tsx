// Hinnete hoidla.
//
// Praegu elavad hinded ainult brauseris (localStorage). Etapis 3 vahetatakse
// `localBackend` API-põhise vastu ja ülejäänud rakendus ei muutu — seepärast käib
// kõik läbi kitsa RatingsBackend liidese ja kõik meetodid on juba praegu async.

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from 'react';
import type { SongStats } from './types';

export const MIN_SCORE = 1;
export const MAX_SCORE = 10;

export interface RatingsBackend {
  /** Kas koondhindeid on üldse kuskilt võtta. Kohalikus režiimis ei ole. */
  readonly hasCommunityScores: boolean;
  loadMine(): Promise<Record<string, number>>;
  setRating(songId: string, score: number): Promise<void>;
  removeRating(songId: string): Promise<void>;
  loadStats(): Promise<Record<string, SongStats>>;
}

const STORAGE_KEY = 'rahvanounikud.hinded.v1';

function readStorage(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const clean: Record<string, number> = {};
    for (const [songId, score] of Object.entries(parsed)) {
      const n = Number(score);
      if (Number.isInteger(n) && n >= MIN_SCORE && n <= MAX_SCORE) clean[songId] = n;
    }
    return clean;
  } catch {
    return {};  // rikutud või kättesaamatu salvestus ei tohi lehte katki teha
  }
}

function writeStorage(all: Record<string, number>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Privaatrežiim või täis kvoot — hinne jääb vähemalt selle seansi ajaks kehtima.
  }
}

export const localBackend: RatingsBackend = {
  hasCommunityScores: false,
  async loadMine() {
    return readStorage();
  },
  async setRating(songId, score) {
    writeStorage({ ...readStorage(), [songId]: score });
  },
  async removeRating(songId) {
    const all = readStorage();
    delete all[songId];
    writeStorage(all);
  },
  async loadStats() {
    return {};
  },
};

interface RatingsContextValue {
  mine: Record<string, number>;
  stats: Record<string, SongStats>;
  hasCommunityScores: boolean;
  ready: boolean;
  ratedCount: number;
  rate(songId: string, score: number): void;
  clearRating(songId: string): void;
}

const RatingsContext = createContext<RatingsContextValue | null>(null);

export function RatingsProvider({
  children,
  backend = localBackend,
}: {
  children: ReactNode;
  backend?: RatingsBackend;
}) {
  const [mine, setMine] = useState<Record<string, number>>({});
  const [stats, setStats] = useState<Record<string, SongStats>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([backend.loadMine(), backend.loadStats()]).then(([m, s]) => {
      if (cancelled) return;
      setMine(m);
      setStats(s);
      setReady(true);
    });
    return () => { cancelled = true; };
  }, [backend]);

  const rate = useCallback((songId: string, score: number) => {
    // Optimistlik uuendus: hindamine peab tunduma hetkeline ka aeglase ühendusega.
    setMine((prev) => ({ ...prev, [songId]: score }));
    void backend.setRating(songId, score);
  }, [backend]);

  const clearRating = useCallback((songId: string) => {
    setMine((prev) => {
      const next = { ...prev };
      delete next[songId];
      return next;
    });
    void backend.removeRating(songId);
  }, [backend]);

  const value = useMemo<RatingsContextValue>(() => ({
    mine,
    stats,
    hasCommunityScores: backend.hasCommunityScores,
    ready,
    ratedCount: Object.keys(mine).length,
    rate,
    clearRating,
  }), [mine, stats, backend, ready, rate, clearRating]);

  return <RatingsContext.Provider value={value}>{children}</RatingsContext.Provider>;
}

export function useRatings(): RatingsContextValue {
  const ctx = useContext(RatingsContext);
  if (!ctx) throw new Error('useRatings peab olema RatingsProvider sees');
  return ctx;
}
