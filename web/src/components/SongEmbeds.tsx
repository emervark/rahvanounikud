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

/**
 * SoundCloud on kolmas allikas neile lugudele, keda kummaski suures teenuses
 * ei ole — väiksed Eesti väljalasked satuvad sinna sageli ainsana.
 *
 * Sama loogika mis YouTube'il: mängija sisu ei ole kujundatav, aga seotud
 * lood, kommentaarid ja reklaamriba saab välja lülitada ning aktsentvärvi
 * lehe omaks seada.
 */
const SC_ACCENT = 'a1256b';

function scSrc(url: string): string {
  const p = new URLSearchParams({
    url,
    color: `#${SC_ACCENT}`,
    auto_play: 'false',
    hide_related: 'true',
    show_comments: 'false',
    show_reposts: 'false',
    show_teaser: 'false',
    show_user: 'true',
  });
  return `https://w.soundcloud.com/player/?${p}`;
}

/**
 * Bandcampi mängija tahab numbrilisi ID-sid, mitte permalinki. Väärtused
 * tulevad overrides-failist, aga sõelume nad ikkagi — aadressi ehitamine
 * kontrollimata sisendist on täpselt see koht, kus üks kirjaviga hiljem
 * millekski muuks muutub.
 */
const BC_ACCENT = 'a1256b';
const numbriline = (v: string | undefined) => (v && /^\d+$/.test(v) ? v : null);

function bcSrc(bc: NonNullable<Song['bandcamp']>): string | null {
  const album = numbriline(bc.album);
  if (!album) return null;
  const track = numbriline(bc.track);
  const osad = [
    `album=${album}`,
    'size=large',
    'bgcol=ffffff',
    `linkcol=${BC_ACCENT}`,
    'tracklist=false',
    'artwork=small',
    track ? `track=${track}` : null,
    'transparent=true',
  ].filter(Boolean);
  return `https://bandcamp.com/EmbeddedPlayer/${osad.join('/')}/`;
}

export function SongEmbeds({ song }: { song: Song }) {
  const bc = song.bandcamp ? bcSrc(song.bandcamp) : null;
  if (!song.spotifyId && !song.youtubeId && !song.soundcloudUrl && !bc) return null;

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

      {song.soundcloudUrl && (
        <iframe
          className="embed-frame embeds__sc"
          style={{ height: 166 }}
          src={scSrc(song.soundcloudUrl)}
          title={`SoundCloud: ${songLabel(song)}`}
          loading="lazy"
          allow="autoplay; encrypted-media"
        />
      )}

      {bc && (
        <iframe
          className="embed-frame embeds__bc"
          style={{ height: 120 }}
          src={bc}
          title={`Bandcamp: ${songLabel(song)}`}
          loading="lazy"
        />
      )}
    </div>
  );
}
