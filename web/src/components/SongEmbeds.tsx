import type { Song } from '../types';
import { songLabel } from '../data';

/**
 * Loo kuulamismängijad.
 *
 * Sama plokk on nii saate lehel kui loo lehel. Varem seisis ta mõlemas kohas
 * eraldi ja hakkas juba lahku minema — saate lehel oli YouTube nupu taga,
 * loo lehel mitte.
 *
 * YouTube on mobiilis esimene. Väiksel ekraanil on video see, mida päriselt
 * vaadatakse; Spotify riba on seal pigem link kui mängija. Laual jääb Spotify
 * ette, sest ta on madal ega lükka hindamisriba ekraanist välja.
 */

/**
 * YouTube'i mängija sisu ise ei ole kujundatav — ta tuleb teisest domeenist
 * iframe'is ja CSS sinna ei ulatu. Parameetritega saab siiski maha võtta
 * kõige valjemad võõrad elemendid: punase edenemisriba (mis oleks lehel
 * ainus punane asi), annotatsioonid ja võõraste kanalite soovitused.
 */
const YT_PARAMS = new URLSearchParams({
  color: 'white',
  rel: '0',
  iv_load_policy: '3',
  playsinline: '1',
}).toString();

export function SongEmbeds({ song }: { song: Song }) {
  if (!song.spotifyId && !song.youtubeId) return null;

  return (
    <div className="embeds">
      {song.spotifyId && (
        <iframe
          className="embed-frame embeds__sp"
          style={{ height: 152 }}
          src={`https://open.spotify.com/embed/track/${song.spotifyId}?utm_source=generator`}
          title={`Spotify: ${songLabel(song)}`}
          loading="lazy"
          allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        />
      )}

      {song.youtubeId && (
        <iframe
          className="embed-frame embeds__yt"
          style={{ aspectRatio: '16 / 9' }}
          src={`https://www.youtube-nocookie.com/embed/${song.youtubeId}?${YT_PARAMS}`}
          title={`YouTube: ${songLabel(song)}`}
          loading="lazy"
          allow="accelerometer; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      )}
    </div>
  );
}
