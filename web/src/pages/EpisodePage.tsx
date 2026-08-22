import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useEpisodesFile } from '../useData';
import { PageState } from '../components/PageState';
import { SongCard } from '../components/SongCard';
import { PodcastPlayer } from '../components/PodcastPlayer';
import { findEpisode, formatDate, formatDuration } from '../data';

const DESCRIPTION_CLAMP = 420;

export function EpisodePage() {
  const { guid = '' } = useParams();
  const { data, error } = useEpisodesFile();
  const [expanded, setExpanded] = useState(false);

  if (!data) return <PageState error={error} />;

  const episode = findEpisode(data, guid);
  if (!episode) {
    return (
      <div className="page">
        <div className="empty" style={{ marginTop: 60 }}>
          Sellist saadet ei leitud. <Link to="/saated">Vaata kõiki saateid</Link>.
        </div>
      </div>
    );
  }

  const index = data.episodes.indexOf(episode);
  const isLong = episode.description.length > DESCRIPTION_CLAMP;
  const description = expanded || !isLong
    ? episode.description
    : `${episode.description.slice(0, DESCRIPTION_CLAMP).trimEnd()}…`;

  return (
    <div className="page">
      <section className="episode-head">
        <Link className="back-link" to="/saated">← Kõik saated</Link>
        <h1>{episode.title}</h1>
        <div className="episode-head__meta">
          <span>{formatDate(episode.publishedAt)}</span>
          {episode.durationSeconds && <span>· {formatDuration(episode.durationSeconds)}</span>}
          <span>· {episode.songs.length} hinnatavat lugu</span>
          <span>· saade nr {data.episodes.length - index}</span>
          {episode.guests.length > 0 && <span>· külas {episode.guests.join(', ')}</span>}
        </div>

        <PodcastPlayer episode={episode} podcast={data.podcast} />

        {episode.description && (
          <div className="episode-description">
            {description}
            {isLong && (
              <button
                type="button"
                className="episode-description__toggle"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? 'Näita vähem' : 'Loe edasi'}
              </button>
            )}
          </div>
        )}
      </section>

      <section style={{ paddingTop: 28 }}>
        <div className="section-head">
          <h2>Hinnatud lood</h2>
          <span className="result-count">Skaala 1–10</span>
        </div>

        {episode.songs.length === 0 ? (
          <div className="empty">Selle saate lugusid pole veel sisestatud.</div>
        ) : (
          <div className="song-list">
            {episode.songs.map((song) => (
              <SongCard key={song.id} song={song} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
