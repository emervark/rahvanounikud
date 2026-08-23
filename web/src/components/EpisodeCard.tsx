import { Link } from 'react-router-dom';
import type { Episode } from '../types';
import { formatDuration } from '../data';

/** Kirjerida saadete nimekirjas — kataloogi rida, mitte kaart. */
export function EpisodeCard({
  episode,
  number,
  last,
}: {
  episode: Episode;
  number: number;
  last?: boolean;
}) {
  const date = new Date(episode.publishedAt);
  const short = [
    String(date.getDate()).padStart(2, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    date.getFullYear(),
  ].join('.');

  const meta = [
    `Saade nr ${number}`,
    episode.durationSeconds && formatDuration(episode.durationSeconds),
  ].filter(Boolean).join(' · ');

  return (
    <Link className={`disp${last ? ' disp--last' : ''}`} to={`/saade/${episode.guid}`}>
      <div className="mono dt">{short}</div>
      <div>
        <div className="mono" style={{ marginBottom: 7 }}>{meta}</div>
        <h3 className="disp__title">{episode.title}</h3>
        <p className="disp__songs">
          {episode.songs.map((s) => s.artistsRaw).join(' · ')}
        </p>
      </div>
      <div className="go">→</div>
    </Link>
  );
}
