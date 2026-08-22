// Worker: /api/* päringud siin, kõik muu läheb staatiliste failide juurde.

import { resolveIdentity, withIdentity } from './auth';
import {
  ApiError, deleteRating, importRatings, readMine, readStats,
  validateScore, validateSongId, writeRating,
} from './ratings';
import { finishGoogleLogin, googleConfig, logout, startGoogleLogin } from './google-auth';

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  COOKIE_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
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

/**
 * Sisselogimise marsruudid haldavad oma küpsiseid ise (tagasitulek Google'ilt
 * seob küpsise hoopis konto kasutaja külge), nii et neid ei tohi mähkida
 * anonüümse identiteedi külgepanekusse — muidu tuleks kaks rn_uid päist.
 */
async function handleAuth(
  request: Request,
  env: Env,
  path: string,
  userId: string,
): Promise<Response | null> {
  if (path === '/api/auth/logout') {
    // POST + sama päritolu, et võõras leht ei saaks kasutajat vaikselt välja logida.
    if (request.method !== 'POST') throw new ApiError(405, 'Väljalogimine käib POST-iga.');
    assertSameOrigin(request);
    return logout();
  }

  const config = googleConfig(env);

  if (path === '/api/auth/google') {
    if (!config) throw new ApiError(503, 'Google\'i sisselogimine ei ole seadistatud.');
    return startGoogleLogin(request, config);
  }

  if (path === '/api/auth/callback') {
    if (!config) throw new ApiError(503, 'Google\'i sisselogimine ei ole seadistatud.');
    return finishGoogleLogin(request, env.DB, config, userId, env.COOKIE_SECRET);
  }

  return null;
}

async function handleApi(
  request: Request,
  env: Env,
  path: string,
  userId: string,
): Promise<Response> {
  const method = request.method;

  if (path === '/api/stats' && method === 'GET') {
    // Koondhinded on avalikud ja muutuvad aeglaselt — lühike vahemälu serva peal
    // hoiab andmebaasi koormuse madalal ka siis, kui saade äsja ilmus.
    return json(
      { stats: await readStats(env.DB) },
      { headers: { 'cache-control': 'public, max-age=30' } },
    );
  }

  if (path === '/api/me' && method === 'GET') {
    const account = await env.DB
      .prepare('SELECT google_sub, display_name FROM users WHERE id = ?')
      .bind(userId)
      .first<{ google_sub: string | null; display_name: string | null }>();

    return json({
      userId,
      ratings: await readMine(env.DB, userId),
      isLoggedIn: Boolean(account?.google_sub),
      displayName: account?.display_name ?? null,
      loginAvailable: googleConfig(env) !== null,
    });
  }

  if (path === '/api/ratings' && method === 'POST') {
    assertSameOrigin(request);
    const body = await readJsonBody(request);
    const songId = validateSongId(body.songId);
    const score = validateScore(body.score);
    return json({ stats: await writeRating(env.DB, userId, songId, score) });
  }

  if (path === '/api/ratings' && method === 'DELETE') {
    assertSameOrigin(request);
    const body = await readJsonBody(request);
    const songId = validateSongId(body.songId);
    return json({ stats: await deleteRating(env.DB, userId, songId) });
  }

  if (path === '/api/ratings/import' && method === 'POST') {
    assertSameOrigin(request);
    const body = await readJsonBody(request);
    if (!body.ratings || typeof body.ratings !== 'object') {
      throw new ApiError(400, 'Puudub väli "ratings".');
    }
    const imported = await importRatings(env.DB, userId, body.ratings as Record<string, unknown>);
    return json({ imported });
  }

  throw new ApiError(404, 'Tundmatu API otspunkt.');
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

    try {
      if (url.pathname.startsWith('/api/auth/')) {
        const authResponse = await handleAuth(request, env, url.pathname, identity.userId);
        if (authResponse) {
          // Sisselogimise algus vajab siiski anonüümset küpsist, et tagasitulekul
          // oleks sama kasutaja ja tema senised hinded leitavad.
          return url.pathname === '/api/auth/google'
            ? withIdentity(authResponse, identity, env.COOKIE_SECRET)
            : authResponse;
        }
      }

      const response = await handleApi(request, env, url.pathname, identity.userId);
      return withIdentity(response, identity, env.COOKIE_SECRET);
    } catch (err) {
      let response: Response;
      if (err instanceof ApiError) {
        response = json({ error: err.message }, { status: err.status });
      } else {
        console.error('API viga:', err);
        response = json({ error: 'Serveri viga.' }, { status: 500 });
      }
      return withIdentity(response, identity, env.COOKIE_SECRET);
    }
  },
} satisfies ExportedHandler<Env>;
