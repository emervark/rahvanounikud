import { Link } from 'react-router-dom';
import type { Episode } from '../types';
import { formatDate, formatDuration } from '../data';

export function EpisodeCard({ episode }: { episode: Episode }) {
  return (
    <Link className="episode-card" to={`/saade/${episode.guid}`}>
      <div className="episode-card__meta">
        <span>{formatDate(episode.publishedAt)}</span>
        {episode.durationSeconds && (
          <>
            <span className="dot">·</span>
            <span>{formatDuration(episode.durationSeconds)}</span>
          </>
        )}
        <span className="dot">·</span>
        <span>{episode.songs.length} lugu</span>
      </div>

      <h3>{episode.title}</h3>

      <ul className="episode-card__songs">
        {episode.songs.map((song) => (
          <li key={song.id}>
            <b>{song.title}</b> — {song.artistsRaw}
          </li>
        ))}
      </ul>
    </Link>
  );
}
