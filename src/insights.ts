// Sisemine statistika: mis lehel päriselt toimub.
//
// Veebianalüütika (Cloudflare Web Analytics) ütleb, kui palju rahvast käis.
// See siin ütleb, mida nad tegid — ja seda teab ainult meie oma andmebaas.
// Kolmandat osapoolt siin ei ole ja külastajale ei saadeta ühtki lisabaiti.
//
// Kõik päringud on koondavad. Ühegi kasutaja hindeid siit kätte ei saa: numbrid
// on summad ja loendurid, mitte read. Nii ei muutu statistikaleht ukseks
// kellegi hindamisajalukku, kui võti peaks lekkima.

import { ApiError } from './ratings';

export interface Insights {
  generatedAt: number;
  kokku: {
    hindeid: number;
    hindajaid: number;
    hinnatudLugusid: number;
    kommentaare: number;
    kontoga: number;
    keskmine: number | null;
  };
  päevad: { päev: string; hindeid: number; hindajaid: number }[];
  jaotus: { hinne: number; mitu: number }[];
  top: { songId: string; keskmine: number; hääli: number }[];
  põhi: { songId: string; keskmine: number; hääli: number }[];
  vaieldud: { songId: string; keskmine: number; hääli: number; hajuvus: number }[];
  aktiivsus: { hindeid: number; hindajaid: number }[];
}

/**
 * Ajaloendurid tahavad kuupäeva SQLite'i kujul. created_at on sekundites, sest
 * nii kirjutab teda ratings.ts — millisekundites tuleks jagada, ja vaikiv
 * ühikuviga oleks siin eriti salakaval: graafik näeks õige välja, aga näitaks
 * 1970. aastat.
 */
const PÄEV = "date(created_at, 'unixepoch')";

/** Vähem kui nii mitu häält ja edetabel räägiks müra, mitte maitse. */
const LÄVI = 3;

async function all<T>(db: D1Database, sql: string, ...bind: unknown[]): Promise<T[]> {
  const r = await db.prepare(sql).bind(...bind).all<T>();
  return r.results ?? [];
}

export async function readInsights(db: D1Database, päevi = 30): Promise<Insights> {
  const [kokku, päevad, jaotus, top, põhi, vaieldud, aktiivsus] = await Promise.all([
    db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM ratings)                               AS hindeid,
        (SELECT COUNT(DISTINCT user_id) FROM ratings)                AS hindajaid,
        (SELECT COUNT(DISTINCT song_id) FROM ratings)                AS hinnatudLugusid,
        (SELECT COUNT(*) FROM comments WHERE deleted_at IS NULL)     AS kommentaare,
        (SELECT COUNT(*) FROM users WHERE google_sub IS NOT NULL)    AS kontoga,
        (SELECT AVG(score) FROM ratings)                             AS keskmine
    `).first<Insights['kokku']>(),

    all<{ päev: string; hindeid: number; hindajaid: number }>(db, `
      SELECT ${PÄEV} AS päev, COUNT(*) AS hindeid, COUNT(DISTINCT user_id) AS hindajaid
      FROM ratings
      WHERE created_at >= unixepoch('now', ?)
      GROUP BY päev
      ORDER BY päev
    `, `-${päevi} days`),

    all<{ hinne: number; mitu: number }>(db, `
      SELECT score AS hinne, COUNT(*) AS mitu
      FROM ratings GROUP BY score ORDER BY score
    `),

    all<{ songId: string; keskmine: number; hääli: number }>(db, `
      SELECT song_id AS songId, ROUND(AVG(score), 2) AS keskmine, COUNT(*) AS hääli
      FROM ratings GROUP BY song_id HAVING hääli >= ?
      ORDER BY keskmine DESC, hääli DESC LIMIT 10
    `, LÄVI),

    all<{ songId: string; keskmine: number; hääli: number }>(db, `
      SELECT song_id AS songId, ROUND(AVG(score), 2) AS keskmine, COUNT(*) AS hääli
      FROM ratings GROUP BY song_id HAVING hääli >= ?
      ORDER BY keskmine ASC, hääli DESC LIMIT 10
    `, LÄVI),

    /* Vaieldavus = hinnete hajuvus. SQLite'is standardhälvet ei ole, seega
       arvutame ta ruutude keskmisest: sqrt(avg(x²) − avg(x)²). Väikese
       ümardusvea tõttu võib vahe olla napilt negatiivne, seepärast MAX(...,0). */
    all<{ songId: string; keskmine: number; hääli: number; hajuvus: number }>(db, `
      SELECT song_id AS songId,
             ROUND(AVG(score), 2) AS keskmine,
             COUNT(*) AS hääli,
             ROUND(SQRT(MAX(AVG(score * score) - AVG(score) * AVG(score), 0)), 2) AS hajuvus
      FROM ratings GROUP BY song_id HAVING hääli >= ?
      ORDER BY hajuvus DESC, hääli DESC LIMIT 10
    `, LÄVI + 1),

    /* Kui palju inimesi on hinnanud mitut lugu — kas rahvas jääb pidama või
       annab ühe hinde ja lahkub. */
    all<{ hindeid: number; hindajaid: number }>(db, `
      SELECT hindeid, COUNT(*) AS hindajaid FROM (
        SELECT user_id, COUNT(*) AS hindeid FROM ratings GROUP BY user_id
      ) GROUP BY hindeid ORDER BY hindeid
    `),
  ]);

  return {
    generatedAt: Date.now(),
    kokku: kokku ?? {
      hindeid: 0, hindajaid: 0, hinnatudLugusid: 0,
      kommentaare: 0, kontoga: 0, keskmine: null,
    },
    päevad, jaotus, top, põhi, vaieldud, aktiivsus,
  };
}

/**
 * Võtme kontroll.
 *
 * Võrdlus on ajakindel: naiivne === lõpetab esimese erineva märgi peal ja
 * vastuseaeg reedaks, kui palju algusest õigesti pakuti. Vahe on väike, aga
 * seda ründajat, kes seda ära kasutab, ei ole raske kirjutada — ja õige
 * võrdlus ei maksa siin midagi.
 *
 * Võti käib päises, mitte URL-is: URL-id satuvad logidesse, ajalukku ja
 * viitajasse, päised mitte.
 */
export function assertStatsKey(request: Request, key: string | undefined): void {
  if (!key) {
    throw new ApiError(503, 'Statistika ei ole seadistatud — STATS_KEY puudub.');
  }
  const päis = request.headers.get('authorization') ?? '';
  const antud = päis.startsWith('Bearer ') ? päis.slice(7) : '';
  if (!ajakindelVõrdne(antud, key)) {
    throw new ApiError(401, 'Vale võti.');
  }
}

function ajakindelVõrdne(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  /* Erineva pikkuse korral võrdleme ikkagi midagi ühepikkust, et ka pikkus ise
     ajast välja ei paistaks. Tulemus on niikuinii vale. */
  const n = Math.max(x.length, y.length);
  let vahe = x.length ^ y.length;
  for (let i = 0; i < n; i++) vahe |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return vahe === 0;
}
