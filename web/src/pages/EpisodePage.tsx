import { useState } from 'react';
import { SectionTag } from '../components/SectionTag';
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
      <div className="empty">
        <p className="mono">
          Sellist saadet ei leitud. <Link to="/saated">Vaata kõiki saateid →</Link>
        </p>
      </div>
    );
  }

  const number = data.episodes.length - data.episodes.indexOf(episode);
  const isLong = episode.description.length > DESCRIPTION_CLAMP;
  const description = expanded || !isLong
    ? episode.description
    : `${episode.description.slice(0, DESCRIPTION_CLAMP).trimEnd()}…`;

  const meta = [
    `Saade nr ${number}`,
    formatDate(episode.publishedAt),
    episode.durationSeconds && formatDuration(episode.durationSeconds),
    `${episode.songs.length} hinnatavat lugu`,
    episode.guests.length > 0 && `külas ${episode.guests.join(', ')}`,
  ].filter(Boolean).join(' · ');

  return (
    <>
      <div className="episode-head">
        <Link className="mono" to="/saated" style={{ display: 'inline-block', marginBottom: 20 }}>
          ← Kõik saated
        </Link>

        <div className="episode-grid">
          <div>
            <div className="mono" style={{ marginBottom: 14 }}>{meta}</div>
            <h1>{episode.title}</h1>
            {episode.description && (
              <div className="episode-desc">
                {description}
                {isLong && (
                  <button
                    type="button"
                    className="episode-desc__toggle"
                    onClick={() => setExpanded((v) => !v)}
                  >
                    {expanded ? 'Näita vähem ↑' : 'Loe edasi ↓'}
                  </button>
                )}
              </div>
            )}
          </div>

          <PodcastPlayer episode={episode} podcast={data.podcast} />
        </div>
      </div>

      <div className="shead" style={{ marginTop: 26 }}>
        <SectionTag num="02" label="Hinnatud lood" />
        <span className="mono note">Skaala 1—10 · sinu hinne salvestub kohe</span>
      </div>

      {episode.songs.length === 0 ? (
        <div className="empty">
          <p className="mono">Selle saate lugusid pole veel sisestatud.</p>
        </div>
      ) : (
        episode.songs.map((song, i) => <SongCard key={song.id} song={song} index={i} />)
      )}
    </>
  );
}
