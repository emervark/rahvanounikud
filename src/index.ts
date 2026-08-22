// Worker: /api/* päringud siin, kõik muu läheb staatiliste failide juurde.

import { resolveIdentity, withIdentity } from './auth';
import {
  ApiError, deleteRating, importRatings, readMine, readStats,
  validateScore, validateSongId, writeRating,
} from './ratings';

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  COOKIE_SECRET: string;
}

const json = (data: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...init?.headers },
  });

/**
 * Kirjutamised nõuavad sama päritolu — muidu saaks võõras leht külastaja küpsist
 * kasutades tema nimel hindeid anda. SameSite=Lax katab enamiku, see on teine lukk.
 */
function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  if (!origin) return;  // sama päritolu päringutel võib Origin puududa
  if (new URL(origin).host !== new URL(request.url).host) {
    throw new ApiError(403, 'Vale päritolu.');
  }
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') throw new Error();
    return body as Record<string, unknown>;
  } catch {
    throw new ApiError(400, 'Vigane päringukeha.');
  }
}

async function handleApi(
  request: Request,
  env: Env,
  path: string,
  userId: string,
): Promise<Response> {
  const method = request.method;

  let response: Response;

  if (path === '/api/stats' && method === 'GET') {
    // Koondhinded on avalikud ja muutuvad aeglaselt — lühike vahemälu serva peal
    // hoiab andmebaasi koormuse madalal ka siis, kui saade äsja ilmus.
    response = json(
      { stats: await readStats(env.DB) },
      { headers: { 'cache-control': 'public, max-age=30' } },
    );
  } else if (path === '/api/me' && method === 'GET') {
    response = json({ userId, ratings: await readMine(env.DB, userId) });
  } else if (path === '/api/ratings' && method === 'POST') {
    assertSameOrigin(request);
    const body = await readJsonBody(request);
    const songId = validateSongId(body.songId);
    const score = validateScore(body.score);
    response = json({ stats: await writeRating(env.DB, userId, songId, score) });
  } else if (path === '/api/ratings' && method === 'DELETE') {
    assertSameOrigin(request);
    const body = await readJsonBody(request);
    const songId = validateSongId(body.songId);
    response = json({ stats: await deleteRating(env.DB, userId, songId) });
  } else if (path === '/api/ratings/import' && method === 'POST') {
    assertSameOrigin(request);
    const body = await readJsonBody(request);
    const ratings = body.ratings;
    if (!ratings || typeof ratings !== 'object') {
      throw new ApiError(400, 'Puudub väli "ratings".');
    }
    const imported = await importRatings(env.DB, userId, ratings as Record<string, unknown>);
    response = json({ imported });
  } else {
    throw new ApiError(404, 'Tundmatu API otspunkt.');
  }

  return response;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    // Identiteet lahendatakse enne käsitlemist ja küpsis pannakse külge ka veale.
    // Muidu jääks vea korral küpsis saamata, brauser saaks järgmisel päringul uue
    // kasutaja-ID ja sama inimene võiks samale loole mitu häält anda.
    const identity = await resolveIdentity(request, env.COOKIE_SECRET);

    let response: Response;
    try {
      response = await handleApi(request, env, url.pathname, identity.userId);
    } catch (err) {
      if (err instanceof ApiError) {
        response = json({ error: err.message }, { status: err.status });
      } else {
        console.error('API viga:', err);
        response = json({ error: 'Serveri viga.' }, { status: 500 });
      }
    }

    return withIdentity(response, identity, env.COOKIE_SECRET);
  },
} satisfies ExportedHandler<Env>;
