// Hinnete hoidla.
//
// Kogu rakendus käib läbi kitsa RatingsBackend liidese. `apiBackend` räägib
// Workeriga, `localBackend` hoiab hindeid ainult brauseris — viimane on olemas
// selleks, et leht töötaks ka siis, kui API pole saadaval (nt puhas `vite build`
// eelvaade), ja et arendades ei peaks andmebaasi püsti panema.

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import type { SongStats } from './types';

export const MIN_SCORE = 1;
export const MAX_SCORE = 10;

/** Kes ma olen ja kas sisselogimine on üldse saadaval. */
export interface Account {
  ratings: Record<string, number>;
  isLoggedIn: boolean;
  displayName: string | null;
  loginAvailable: boolean;
}

export interface RatingsBackend {
  /** Kas koondhindeid on kuskilt võtta. Kohalikus režiimis ei ole. */
  readonly hasCommunityScores: boolean;
  loadMe(): Promise<Account>;
  /** Tagastab loo uued koondnäitajad, kui backend neid teab. */
  setRating(songId: string, score: number): Promise<SongStats | null>;
  removeRating(songId: string): Promise<SongStats | null>;
  loadStats(): Promise<Record<string, SongStats>>;
}

const STORAGE_KEY = 'rahvanounikud.hinded.v1';
const MIGRATED_KEY = 'rahvanounikud.hinded-ule-toodud.v1';

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
  async loadMe() {
    return {
      ratings: readStorage(),
      isLoggedIn: false,
      displayName: null,
      loginAvailable: false,
    };
  },
  async setRating(songId, score) {
    writeStorage({ ...readStorage(), [songId]: score });
    return null;
  },
  async removeRating(songId) {
    const all = readStorage();
    delete all[songId];
    writeStorage(all);
    return null;
  },
  async loadStats() {
    return {};
  },
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? `Päring ebaõnnestus (${res.status})`);
  }
  return res.json() as Promise<T>;
}

/**
 * Toob varem ainult brauserisse salvestatud hinded serverisse.
 *
 * Käib täpselt korra seadme kohta. Server ei kirjuta olemasolevaid hindeid üle,
 * nii et kordus oleks kahjutu — aga lipp hoiab ära mõttetu päringu igal laadimisel.
 */
async function migrateLocalRatings(): Promise<void> {
  try {
    if (localStorage.getItem(MIGRATED_KEY)) return;
    const local = readStorage();
    if (Object.keys(local).length > 0) {
      await api('/api/ratings/import', {
        method: 'POST',
        body: JSON.stringify({ ratings: local }),
      });
    }
    localStorage.setItem(MIGRATED_KEY, String(Date.now()));
  } catch {
    // Ebaõnnestunud ületoomine ei tohi lehte kinni panna — proovime järgmine kord.
  }
}

export const apiBackend: RatingsBackend = {
  hasCommunityScores: true,
  async loadMe() {
    await migrateLocalRatings();
    return api<Account>('/api/me');
  },
  async setRating(songId, score) {
    const { stats } = await api<{ stats: SongStats }>('/api/ratings', {
      method: 'POST',
      body: JSON.stringify({ songId, score }),
    });
    return stats;
  },
  async removeRating(songId) {
    const { stats } = await api<{ stats: SongStats }>('/api/ratings', {
      method: 'DELETE',
      body: JSON.stringify({ songId }),
    });
    return stats;
  },
  async loadStats() {
    const { stats } = await api<{ stats: Record<string, SongStats> }>('/api/stats');
    return stats;
  },
};

interface RatingsContextValue {
  mine: Record<string, number>;
  stats: Record<string, SongStats>;
  hasCommunityScores: boolean;
  ready: boolean;
  ratedCount: number;
  error: string | null;
  isLoggedIn: boolean;
  displayName: string | null;
  loginAvailable: boolean;
  rate(songId: string, score: number): void;
  clearRating(songId: string): void;
}

const ANONYMOUS: Account = {
  ratings: {}, isLoggedIn: false, displayName: null, loginAvailable: false,
};

const RatingsContext = createContext<RatingsContextValue | null>(null);

export function RatingsProvider({
  children,
  backend = apiBackend,
}: {
  children: ReactNode;
  backend?: RatingsBackend;
}) {
  const [mine, setMine] = useState<Record<string, number>>({});
  const [stats, setStats] = useState<Record<string, SongStats>>({});
  const [account, setAccount] = useState<Account>(ANONYMOUS);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Optimistlikult näidatud hinne tuleb tagasi keerata, kui kirjutamine kukub läbi.
  const previous = useRef<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all([backend.loadMe(), backend.loadStats()]).then(
      ([me, s]) => {
        if (cancelled) return;
        setAccount(me);
        setMine(me.ratings);
        setStats(s);
        setReady(true);
      },
      (err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Hindeid ei õnnestunud laadida.');
        setReady(true);
      },
    );
    return () => { cancelled = true; };
  }, [backend]);

  const applyStats = useCallback((fresh: SongStats | null) => {
    if (!fresh) return;
    setStats((prev) => ({ ...prev, [fresh.songId]: fresh }));
  }, []);

  const rate = useCallback((songId: string, score: number) => {
    setMine((prev) => {
      previous.current[songId] = prev[songId];
      return { ...prev, [songId]: score };
    });
    setError(null);

    backend.setRating(songId, score).then(applyStats, (err: unknown) => {
      setMine((prev) => {
        const next = { ...prev };
        const old = previous.current[songId];
        if (old === undefined) delete next[songId];
        else next[songId] = old;
        return next;
      });
      setError(err instanceof Error ? err.message : 'Hinde salvestamine ebaõnnestus.');
    });
  }, [backend, applyStats]);

  const clearRating = useCallback((songId: string) => {
    setMine((prev) => {
      previous.current[songId] = prev[songId];
      const next = { ...prev };
      delete next[songId];
      return next;
    });
    setError(null);

    backend.removeRating(songId).then(applyStats, (err: unknown) => {
      setMine((prev) => {
        const old = previous.current[songId];
        return old === undefined ? prev : { ...prev, [songId]: old };
      });
      setError(err instanceof Error ? err.message : 'Hinde eemaldamine ebaõnnestus.');
    });
  }, [backend, applyStats]);

  const value = useMemo<RatingsContextValue>(() => ({
    mine,
    stats,
    hasCommunityScores: backend.hasCommunityScores,
    ready,
    ratedCount: Object.keys(mine).length,
    error,
    isLoggedIn: account.isLoggedIn,
    displayName: account.displayName,
    loginAvailable: account.loginAvailable,
    rate,
    clearRating,
  }), [mine, stats, backend, ready, error, account, rate, clearRating]);

  return <RatingsContext.Provider value={value}>{children}</RatingsContext.Provider>;
}

export function useRatings(): RatingsContextValue {
  const ctx = useContext(RatingsContext);
  if (!ctx) throw new Error('useRatings peab olema RatingsProvider sees');
  return ctx;
}
