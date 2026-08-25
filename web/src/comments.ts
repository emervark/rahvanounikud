// Kommentaaride kiht.
//
// Eraldi hindest, sest kommentaare laetakse ainult loo lehel — kõigi 376 loo
// kommentaare korraga tõmmata poleks mõtet. Ainus, mis kõikjal vaja läheb,
// on kommentaaride arv, ja see tuleb ühe kerge päringuga.

import { useCallback, useEffect, useState } from 'react';

export const MAX_BODY = 1500;
export const MAX_NAME = 40;

export interface Comment {
  id: string;
  songId: string;
  body: string;
  authorName: string;
  isMine: boolean;
  isLoggedIn: boolean;
  createdAt: number;
  editedAt: number | null;
}

/** Server ütleb 428, kui kommenteerimiseks on nime vaja. */
export const NEEDS_NAME = 428;

export class CommentError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null) as { error?: string } | null;
    throw new CommentError(res.status, body?.error ?? `Päring ebaõnnestus (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function saveDisplayName(name: string): Promise<string> {
  const { displayName } = await api<{ displayName: string }>('/api/name', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  return displayName;
}

export function useComments(songId: string) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsName, setNeedsName] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setComments(null);
    api<{ comments: Comment[] }>(`/api/comments?songId=${encodeURIComponent(songId)}`).then(
      ({ comments: list }) => { if (!cancelled) setComments(list); },
      (err: unknown) => {
        if (cancelled) return;
        // Kommentaaride puudumine ei tohi lugu ennast kinni panna.
        setComments([]);
        setError(err instanceof Error ? err.message : 'Kommentaare ei õnnestunud laadida.');
      },
    );
    return () => { cancelled = true; };
  }, [songId]);

  const run = useCallback(async (fn: () => Promise<{ comments: Comment[] }>) => {
    setBusy(true);
    setError(null);
    try {
      const { comments: list } = await fn();
      setComments(list);
      setNeedsName(false);
      return true;
    } catch (err) {
      if (err instanceof CommentError && err.status === NEEDS_NAME) {
        setNeedsName(true);
      } else {
        setError(err instanceof Error ? err.message : 'Midagi läks valesti.');
      }
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const add = useCallback((body: string) => run(() =>
    api<{ comments: Comment[] }>('/api/comments', {
      method: 'POST',
      body: JSON.stringify({ songId, body }),
    })), [run, songId]);

  const edit = useCallback((id: string, body: string) => run(() =>
    api<{ comments: Comment[] }>('/api/comments', {
      method: 'PATCH',
      body: JSON.stringify({ id, body }),
    })), [run]);

  const remove = useCallback((id: string) => run(() =>
    api<{ comments: Comment[] }>('/api/comments', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    })), [run]);

  return { comments, error, needsName, busy, add, edit, remove, setNeedsName };
}

/**
 * Kommentaaride arv loo kohta — edetabelisse ja loo kaardile.
 *
 * Päring jagatakse kõigi kutsujate vahel: saate lehel on neli loo kaarti ja
 * igaüks neist küsiks muidu sama nimekirja uuesti.
 */
let countsPromise: Promise<Record<string, number>> | null = null;

export function useCommentCounts(): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    countsPromise ??= api<{ counts: Record<string, number> }>('/api/comments/counts')
      .then(({ counts: c }) => c);

    countsPromise.then(
      (c) => { if (!cancelled) setCounts(c); },
      () => {
        // Arv on lisainfo, mitte sisu — vaikimine on siin õige. Aga vahemälu
        // tuleb tühjaks lasta, et järgmine katse ei saaks sama viga uuesti.
        countsPromise = null;
      },
    );
    return () => { cancelled = true; };
  }, []);

  return counts;
}

const MONTHS = [
  'jaan', 'veebr', 'märts', 'apr', 'mai', 'juuni',
  'juuli', 'aug', 'sept', 'okt', 'nov', 'dets',
];

export function formatWhen(ms: number): string {
  const d = new Date(ms);
  const now = Date.now();
  const mins = Math.round((now - ms) / 60000);
  if (mins < 1) return 'äsja';
  if (mins < 60) return `${mins} min tagasi`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h tagasi`;
  return `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Viimased kommentaarid üle kõigi lugude — avalehe plokk.
 *
 * Sama vahemälumuster mis loenduritel: avalehel on see üksainus plokk, aga
 * React StrictMode käivitab effekti arenduses kaks korda ja lehelt tagasi
 * tulek paneks päringu uuesti käima. Jagatud lubadus hoiab neid ühe päringu
 * peal koos.
 */
export type LatestComment = Omit<Comment, 'isMine'>;

let latestPromise: Promise<LatestComment[]> | null = null;

export function useLatestComments(n = 6): LatestComment[] | null {
  const [comments, setComments] = useState<LatestComment[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    latestPromise ??= api<{ comments: LatestComment[] }>(`/api/comments/latest?n=${n}`)
      .then(({ comments: c }) => c);

    latestPromise.then(
      (c) => { if (!cancelled) setComments(c); },
      () => {
        /* Plokk on lisa, mitte lehe sisu — vaikime ja jätame ta näitamata.
           Vahemälu läheb tühjaks, et järgmine katse ei korda sama viga. */
        latestPromise = null;
        if (!cancelled) setComments([]);
      },
    );
    return () => { cancelled = true; };
  }, [n]);

  return comments;
}
