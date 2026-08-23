import { useEffect, useState } from 'react';
import { loadEpisodes, setArtistNames } from './data';
import type { EpisodesFile } from './types';

interface DataState {
  data: EpisodesFile | null;
  error: string | null;
}

/** Laeb episodes.json korra ja jagab tulemust kõigile lehtedele. */
export function useEpisodesFile(): DataState {
  const [state, setState] = useState<DataState>({ data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    loadEpisodes().then(
      (data) => { if (cancelled) return; setArtistNames(data); setState({ data, error: null }); },
      (err: unknown) => !cancelled && setState({
        data: null,
        error: err instanceof Error ? err.message : 'Tundmatu viga',
      }),
    );
    return () => { cancelled = true; };
  }, []);

  return state;
}
