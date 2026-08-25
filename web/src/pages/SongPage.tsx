import { Link, useParams } from 'react-router-dom';
import { SectionTag } from '../components/SectionTag';
import { useEpisodesFile } from '../useData';
import { PageState } from '../components/PageState';
import { ScorePlate } from '../components/ScoreBadge';
import { RatingBar } from '../components/RatingBar';
import { Comments } from '../components/Comments';
import { useRatings } from '../ratings';
import { allSongs, formatDate, songLabel } from '../data';
import { SongEmbeds } from '../components/SongEmbeds';

/**
 * Ühe loo leht.
 *
 * Edetabelist ja saate lehelt jõuab siia, mitte otse podcasti juurde — kõigepealt
 * lugu ise koos hinnete ja kommentaaridega, saade alles siit edasi. Saate juurde
 * pääseb endiselt, aga see on teadlik teine klikk, mitte esimese kliki üllatus.
 */
export function SongPage() {
  const { songId = '' } = useParams();
  const { data, error } = useEpisodesFile();
  const { stats, mine } = useRatings();

  if (!data) return <PageState error={error} />;

  const found = allSongs(data).find(({ song }) => song.id === songId);
  if (!found) {
    return (
      <div className="empty">
        <p className="mono">
          Sellist lugu ei leitud. <Link to="/edetabel">Vaata edetabelit →</Link>
        </p>
      </div>
    );
  }

  const { song, episode } = found;
  const number = data.episodes.length - data.episodes.indexOf(episode);
  const index = episode.songs.indexOf(song);

  const meta = [
    `Lugu ${String(index + 1).padStart(2, '0')}`,
    song.chooser && `valis ${song.chooser}`,
    song.note,
  ].filter(Boolean).join(' · ');

  return (
    <>
      <div className="episode-head">
        <Link className="mono" to="/edetabel" style={{ display: 'inline-block', marginBottom: 20 }}>
          ← Edetabel
        </Link>

        <div className="songpage__head">
          <div className="mono" style={{ marginBottom: 12 }}>{meta}</div>
          <h1 className="songpage__title">{song.title}</h1>
          <div className="songpage__artist">{song.artistsRaw}</div>

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
          </div>
        </div>

        {/* Mängija, hindamisriba ja hindeplaat algavad ühelt jooneltt */}
        <div className="songpage__body">
          <div className="songpage__player">
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
      </div>

      <div className="shead">
        <SectionTag label="Kust see lugu tuli" tone="lav" />
      </div>

      <Link className="disp disp--last" to={`/saade/${episode.guid}`}>
        <div className="mono dt">{formatDate(episode.publishedAt).slice(0, 20)}</div>
        <div>
          <div className="mono" style={{ marginBottom: 7 }}>
            Saade nr {number} · kuula tervet saadet
          </div>
          <h3 className="disp__title">{episode.title}</h3>
          <p className="disp__songs">
            {episode.songs.map((s) => s.artistsRaw).join(' · ')}
          </p>
        </div>
        <div className="go">→</div>
      </Link>

      <Comments songId={song.id} />
    </>
  );
}
