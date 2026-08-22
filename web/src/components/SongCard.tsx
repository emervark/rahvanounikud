import { useState } from 'react';
import type { Song } from '../types';
import { useRatings } from '../ratings';
import { RatingBar } from './RatingBar';
import { CommunityScore } from './ScoreBadge';
import { songLabel } from '../data';

/**
 * Kuulamisvõimalused. Kui build-ajal on Spotify/YouTube ID juba lahendatud,
 * saab loo siinsamas ära kuulata; kui mitte, viivad lingid otsingusse.
 * Nii on leht kasutatav ka enne, kui kõik ~376 lugu on lahendatud.
 */
function ListenOptions({ song }: { song: Song }) {
  const [showYoutube, setShowYoutube] = useState(false);

  return (
    <>
      {song.spotifyId && (
        <iframe
          className="embed-frame"
          style={{ height: 152 }}
          src={`https://open.spotify.com/embed/track/${song.spotifyId}?utm_source=generator&theme=0`}
          title={`Spotify: ${songLabel(song)}`}
          loading="lazy"
          allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        />
      )}

      {song.youtubeId && showYoutube && (
        <iframe
          className="embed-frame"
          style={{ aspectRatio: '16 / 9' }}
          src={`https://www.youtube-nocookie.com/embed/${song.youtubeId}`}
          title={`YouTube: ${songLabel(song)}`}
          loading="lazy"
          allow="accelerometer; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      )}

      {song.youtubeId && !showYoutube && (
        <button type="button" className="embed-toggle" onClick={() => setShowYoutube(true)}>
          Näita YouTube'i videot
        </button>
      )}

      <div className="listen-row">
        {!song.spotifyId && (
          <a
            className="listen-link listen-link--spotify"
            href={song.searchUrls.spotify}
            target="_blank"
            rel="noreferrer"
          >
            Otsi Spotifyst
          </a>
        )}
        {!song.youtubeId && (
          <a
            className="listen-link listen-link--youtube"
            href={song.searchUrls.youtube}
            target="_blank"
            rel="noreferrer"
          >
            Otsi YouTube'ist
          </a>
        )}
        <a
          className="listen-link listen-link--bandcamp"
          href={song.searchUrls.bandcamp}
          target="_blank"
          rel="noreferrer"
        >
          Otsi Bandcampist
        </a>
      </div>
    </>
  );
}

export function SongCard({ song }: { song: Song }) {
  const { stats } = useRatings();

  return (
    <article className="song-card">
      <div className="song-card__head">
        <div className="song-card__title">
          <h3>{song.title}</h3>
          <div className="song-card__artist">{song.artistsRaw}</div>
          {song.note && <div className="song-card__note">{song.note}</div>}
          {song.chooser && <div className="chooser-tag">Valis {song.chooser}</div>}
        </div>
        <CommunityScore stats={stats[song.id]} />
      </div>

      <ListenOptions song={song} />

      <RatingBar songId={song.id} label={songLabel(song)} />
    </article>
  );
}
