import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Song } from '../types';
import { useRatings } from '../ratings';
import { RatingBar } from './RatingBar';
import { ScorePlate } from './ScoreBadge';
import { Comments } from './Comments';
import { songLabel } from '../data';
import { useCommentCounts } from '../comments';

/**
 * Kuulamisvõimalused. Kui build-ajal on Spotify/YouTube ID juba lahendatud,
 * saab loo siinsamas ära kuulata; kui mitte, viivad lingid otsingusse.
 * Nii on leht kasutatav ka enne, kui kõik lood on lahendatud.
 */
function ListenOptions({
  song, comments, onToggleComments, commentsOpen,
}: {
  song: Song;
  comments: number;
  onToggleComments: () => void;
  commentsOpen: boolean;
}) {
  return (
    <div className="listen-row">
        {!song.spotifyId && (
          <a className="listen-link" href={song.searchUrls.spotify} target="_blank" rel="noreferrer">
            Otsi Spotifyst ↗
          </a>
        )}
        {!song.youtubeId && (
          <a className="listen-link" href={song.searchUrls.youtube} target="_blank" rel="noreferrer">
            Otsi YouTube'ist ↗
          </a>
        )}
        <a className="listen-link" href={song.searchUrls.bandcamp} target="_blank" rel="noreferrer">
          Otsi Bandcampist ↗
        </a>
      {/* Avab lõime kohapeal — kommenteerimiseks ei pea saate lehelt lahkuma */}
      <button
        type="button"
        className={`listen-link${commentsOpen ? ' listen-link--on' : ''}`}
        onClick={onToggleComments}
        aria-expanded={commentsOpen}
      >
        {comments > 0 ? `Kommentaarid · ${comments}` : 'Kommenteeri'}
        <span aria-hidden="true">{commentsOpen ? ' ↑' : ' ↓'}</span>
      </button>
    </div>
  );
}

/** Mängijad eraldi, sest need istuvad hindeplaadiga samas reas. */
function SongEmbeds({ song }: { song: Song }) {
  const [showYoutube, setShowYoutube] = useState(false);

  return (
    <>
      {song.spotifyId && (
        <iframe
          className="embed-frame"
          style={{ height: 152, marginTop: 0 }}
          src={`https://open.spotify.com/embed/track/${song.spotifyId}?utm_source=generator`}
          title={`Spotify: ${songLabel(song)}`}
          loading="lazy"
          allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        />
      )}

      {song.youtubeId && !showYoutube && song.spotifyId && (
        <button type="button" className="listen-link" style={{ marginTop: 10 }}
                onClick={() => setShowYoutube(true)}>
          Näita YouTube'i videot
        </button>
      )}

      {song.youtubeId && (showYoutube || !song.spotifyId) && (
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
    </>
  );
}

export function SongCard({ song, index }: { song: Song; index: number }) {
  const { stats, mine } = useRatings();
  const commentCounts = useCommentCounts();
  const comments = commentCounts[song.id] ?? 0;
  const [showComments, setShowComments] = useState(false);

  const meta = [
    `Lugu ${String(index + 1).padStart(2, '0')}`,
    song.chooser && `valis ${song.chooser}`,
    song.note,
  ].filter(Boolean).join(' · ');

  return (
    <article className="song">
      <div className="song__head">
        <div className="mono" style={{ marginBottom: 8 }}>{meta}</div>
        <h3><Link to={`/lugu/${song.id}`}>{song.title}</Link></h3>
        <div className="song__artist">{song.artistsRaw}</div>
        <ListenOptions
          song={song}
          comments={comments}
          commentsOpen={showComments}
          onToggleComments={() => setShowComments((v) => !v)}
        />
      </div>

      {/* Mängija, hindamisriba ja hindeplaat algavad ühelt jooneltt — plaat
          ei hõlju üksi pealkirja kõrval. */}
      <div className="song__body">
        <div className="song__player">
          <SongEmbeds song={song} />
          <RatingBar songId={song.id} label={songLabel(song)} />
        </div>

        <ScorePlate
          stats={stats[song.id]}
          criticScore={song.criticScore}
          criticScores={song.criticScores}
          myScore={mine[song.id]}
        />
      </div>

      {showComments && <Comments songId={song.id} heading={false} />}
    </article>
  );
}
