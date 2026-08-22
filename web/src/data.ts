import type { EpisodesFile, Episode, Song, SongWithEpisode } from './types';

let cache: Promise<EpisodesFile> | null = null;

/** Laeb episodes.json (staatiline fail) ja hoiab tulemust mälus. */
export function loadEpisodes(): Promise<EpisodesFile> {
  if (!cache) {
    cache = fetch('/episodes.json').then((res) => {
      if (!res.ok) throw new Error(`Andmete laadimine ebaõnnestus (${res.status})`);
      return res.json() as Promise<EpisodesFile>;
    });
  }
  return cache;
}

export function allSongs(file: EpisodesFile): SongWithEpisode[] {
  return file.episodes.flatMap((episode) => episode.songs.map((song) => ({ song, episode })));
}

export function findEpisode(file: EpisodesFile, guid: string): Episode | undefined {
  return file.episodes.find((e) => e.guid === guid);
}

export function songLabel(song: Song): string {
  return `${song.artistsRaw} — ${song.title}`;
}

const MONTHS = [
  'jaanuar', 'veebruar', 'märts', 'aprill', 'mai', 'juuni',
  'juuli', 'august', 'september', 'oktoober', 'november', 'detsember',
];

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

/** Otsingusõne, mille vastu saab saateid ja lugusid filtreerida. */
export function searchHaystack(episode: Episode): string {
  return [
    episode.title,
    ...episode.guests,
    ...episode.songs.flatMap((s) => [s.artistsRaw, s.title]),
  ].join(' ').toLowerCase();
}

export function normalize(s: string): string {
  return s.toLowerCase().trim();
}
