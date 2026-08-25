export interface Song {
  id: string;
  artists: string[];
  artistsRaw: string;
  title: string;
  /** Kes saates selle loo kuulamiseks välja valis. Kõigil saadetel pole teada. */
  chooser: string | null;
  /** Nt albuminimi, mis kirjelduses pealkirja järel oli. */
  note: string | null;
  spotifyId: string | null;
  youtubeId: string | null;
  /* Kolmandad allikad neile, keda Spotifys ega YouTube'is ei ole — väiksed
     Eesti väljalasked satuvad sinna sageli ainsana. Mõlemad tulevad ainult
     käsitsi overrides.json-ist; resolverit neil ei ole. */
  soundcloudUrl: string | null;
  bandcamp: { album: string; track?: string; url: string } | null;
  /**
   * Kriitikute antud koondhinne saates. Podcasti kirjeldustes numbrilisi
   * hindeid EI ole — kirjas on ainult „Milline lugu võitis?”. Seepärast saab
   * selle ainult käsitsi data/overrides.json kaudu lisada, ja UI näitab
   * võrdlust „Nõunike skoor vs Rahva hääl” alles siis, kui väärtus on olemas.
   */
  criticScore: number | null;
  /** Kriitikute kaupa, kui need on sisestatud. Keskmine on criticScore. */
  criticScores: Record<string, number> | null;
  searchUrls: {
    spotify: string;
    youtube: string;
    bandcamp: string;
  };
}

export interface Episode {
  guid: string;
  title: string;
  publishedAt: string;
  duration: string | null;
  durationSeconds: number | null;
  description: string;
  audioUrl: string | null;
  coverImageUrl: string | null;
  delfiUrl: string;
  /** Täidetakse etapis 5. Kuni null, kasutab mängija saate üldist Spotify embedit. */
  spotifyEpisodeId: string | null;
  chooser: string | null;
  guests: string[];
  source: 'automaatne' | 'kasitsi';
  songs: Song[];
}

export interface PodcastMeta {
  id: string;
  title: string;
  publisher: string;
  hosts: string[];
  delfiUrl: string;
  spotifyUrl: string;
  spotifyShowId: string;
  coverImageUrl: string | null;
}

export interface EpisodesFile {
  generatedAt: string;
  podcast: PodcastMeta;
  stats: {
    episodes: number; songs: number;
    withSpotify: number; withYoutube: number; withCriticScore: number;
  };
  episodes: Episode[];
}

/** Ühe loo koondtulemus kõigi hindajate peale. */
export interface SongStats {
  songId: string;
  count: number;
  average: number;
}

/** Lugu koos saatega, kust ta pärit on — edetabeli ja otsingu jaoks. */
export interface SongWithEpisode {
  song: Song;
  episode: Episode;
}
