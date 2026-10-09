import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { formatWhen, useLatestComments } from '../comments';
import { allSongs } from '../data';
import type { EpisodesFile } from '../types';
import { SectionTag } from './SectionTag';

/**
 * Avalehe plokk: mida rahvas viimati kirjutas.
 *
 * Kommenteerimine oli seni peidus loo lehel ja saate kaardi nupu taga — kes
 * avalehele sattus, ei näinud, et siin üldse räägitakse. Plokk teeb vestluse
 * nähtavaks ja iga kommentaar viib oma loo juurde.
 *
 * Tühjana plokki ei ole: tühi „viimased kommentaarid" kast ütleks uuele
 * külastajale, et siin ei ole kunagi keegi midagi kirjutanud, mis on halvem
 * kui vaikus.
 */
export function LatestComments({ data }: { data: EpisodesFile }) {
  const comments = useLatestComments(6);

  /* Kommentaar teab ainult loo ID-d — pealkiri ja esitaja tulevad samast
     failist, mis lehel niikuinii juba laetud on. */
  const songs = useMemo(() => {
    const map = new Map<string, { title: string; artistsRaw: string }>();
    for (const { song } of allSongs(data)) {
      map.set(song.id, { title: song.title, artistsRaw: song.artistsRaw });
    }
    return map;
  }, [data]);

  if (!comments || comments.length === 0) return null;

  return (
    <section className="panel panel--pink talk-panel">
      <div className="talk-panel__head">
        <SectionTag label="Viimased kommentaarid" tone="pink" />
        <Link className="mono note talk-panel__all" to="/edetabel">
          Kõik lood <span className="arw">→</span>
        </Link>
      </div>

      <div className="talk">
        {comments.map((c) => {
          const song = songs.get(c.songId);
          return (
            <Link className="talk__item" key={c.id} to={`/lugu/${c.songId}`}>
              <p className="talk__body">{c.body}</p>
              <div className="talk__meta mono">
                <span className="talk__who">{c.authorName}</span>
                <span className="talk__when">{formatWhen(c.createdAt)}</span>
              </div>
              {song && (
                <div className="talk__song">
                  <b>{song.title}</b>
                  <span>{song.artistsRaw}</span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
