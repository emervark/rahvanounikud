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
    ? `https://open.spotify.com/embed/episode/${episode.spotifyEpisodeId}`
    : `https://open.spotify.com/embed/show/${podcast.spotifyShowId}`;

  return (
    <section className="player">
      <div className="mono">Kuula saadet</div>

      <div className="player__tabs">
        <button type="button" className={tab === 'spotify' ? 'on' : ''} onClick={() => setTab('spotify')}>
          Spotify
        </button>
        {episode.audioUrl && (
          <button type="button" className={tab === 'otse' ? 'on' : ''} onClick={() => setTab('otse')}>
            Kuula siin
          </button>
        )}
        <button type="button" className={tab === 'delfi' ? 'on' : ''} onClick={() => setTab('delfi')}>
          Tasku
        </button>
      </div>

      {tab === 'spotify' && (
        <>
          <iframe
            className="embed-frame"
            style={{ height: episode.spotifyEpisodeId ? 152 : 352, marginTop: 0 }}
            src={spotifySrc}
            title={`Spotify: ${episode.title}`}
            loading="lazy"
            allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          />
          {!episode.spotifyEpisodeId && (
            <p className="mono player__hint">
              Selle episoodi otsemängijat Spotify API ei anna — vali saade ülalt nimekirjast.
            </p>
          )}
        </>
      )}

      {tab === 'otse' && episode.audioUrl && (
        <>
          <button
            type="button"
            className={`btn${isPlayingHere ? '' : ' solid'}`}
            style={{ width: '100%', justifyContent: 'space-between', marginTop: 4 }}
            onClick={() => (isPlayingHere ? stop() : play(episode))}
          >
            {isPlayingHere ? 'Peata kuulamine' : 'Kuula saadet siin'}
            {!isPlayingHere && <span className="arw">→</span>}
          </button>
          <p className="mono player__hint">
            Mängija jääb lehe alla kinni, nii et saad saadet kuulates lugusid hinnata.
            Heli tuleb otse Delfi serverist ega jõua nende kuulamisstatistikasse.
          </p>
        </>
      )}

      {tab === 'delfi' && (
        <>
          <a
            className="btn"
            style={{ width: '100%', justifyContent: 'space-between', marginTop: 4 }}
            href={episode.delfiUrl}
            target="_blank"
            rel="noreferrer"
          >
            Ava Delfi Taskus <span className="arw">↗</span>
          </a>
          <p className="mono player__hint">
            „Muusikanõunikud” on Delfi Meedia saade. See leht ei ole Delfiga seotud.
          </p>
        </>
      )}
    </section>
  );
}
