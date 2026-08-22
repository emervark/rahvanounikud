import { useState } from 'react';
import type { Episode, PodcastMeta } from '../types';
import { usePlayer } from '../player';

type Tab = 'spotify' | 'otse' | 'delfi';

/**
 * Saate kuulamine. Vaikimisi Spotify, sest siis läheb kuulamine Delfile arvesse
 * ja õiguslikult on see puhas — otsemängija on olemas selle jaoks, et saadet
 * kuulates saaks samal ajal lehel lugusid hinnata.
 */
export function PodcastPlayer({ episode, podcast }: { episode: Episode; podcast: PodcastMeta }) {
  const [tab, setTab] = useState<Tab>('spotify');
  const { current, play, stop } = usePlayer();

  const isPlayingHere = current?.guid === episode.guid;
  const spotifySrc = episode.spotifyEpisodeId
    ? `https://open.spotify.com/embed/episode/${episode.spotifyEpisodeId}?theme=0`
    : `https://open.spotify.com/embed/show/${podcast.spotifyShowId}?theme=0`;

  return (
    <section className="player-panel">
      <div className="player-tabs">
        <button
          type="button"
          className={`player-tab${tab === 'spotify' ? ' is-active' : ''}`}
          onClick={() => setTab('spotify')}
        >
          Spotify
        </button>
        {episode.audioUrl && (
          <button
            type="button"
            className={`player-tab${tab === 'otse' ? ' is-active' : ''}`}
            onClick={() => setTab('otse')}
          >
            Kuula siin
          </button>
        )}
        <button
          type="button"
          className={`player-tab${tab === 'delfi' ? ' is-active' : ''}`}
          onClick={() => setTab('delfi')}
        >
          Delfi Tasku
        </button>
      </div>

      {tab === 'spotify' && (
        <>
          <iframe
            className="embed-frame"
            style={{ height: episode.spotifyEpisodeId ? 180 : 352 }}
            src={spotifySrc}
            title={`Spotify: ${episode.title}`}
            loading="lazy"
            allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          />
          {!episode.spotifyEpisodeId && (
            <p className="player-hint">
              Otse selle episoodi mängijat pole veel seotud — vali saade ülalt nimekirjast.
            </p>
          )}
        </>
      )}

      {tab === 'otse' && episode.audioUrl && (
        <>
          {isPlayingHere ? (
            <button type="button" className="button button--ghost" onClick={stop}>
              Peata kuulamine
            </button>
          ) : (
            <button type="button" className="button button--primary" onClick={() => play(episode)}>
              Kuula saadet siin
            </button>
          )}
          <p className="player-hint">
            Mängija jääb lehe alla kinni, nii et saad saadet kuulates lugusid hinnata.
            Heli tuleb otse Delfi serverist ega jõua nende kuulamisstatistikasse —
            kui tahad saadet arvesse lugeda, kasuta Spotify või Delfi Tasku vahekaarti.
          </p>
        </>
      )}

      {tab === 'delfi' && (
        <>
          <a className="button button--primary" href={episode.delfiUrl} target="_blank" rel="noreferrer">
            Ava Delfi Taskus
          </a>
          <p className="player-hint">
            „Muusikanõunikud” on Delfi Meedia saade. See leht ei ole Delfiga seotud.
          </p>
        </>
      )}
    </section>
  );
}
