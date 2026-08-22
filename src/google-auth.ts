// Valikuline Google'i sisselogimine.
//
// Hindamine töötab ka ilma selleta — sisselogimine on selleks, et hinded ei oleks
// seotud ühe brauseri küpsisega, vaid kontoga: teine seade, uus brauser, kustutatud
// ajalugu. Seepärast on kogu voo tähtsaim osa mitte autentimine ise, vaid see, et
// juba antud anonüümsed hinded lähevad sisselogimisel kaasa ega kao.

import { ApiError } from './ratings';
import { identityCookie } from './auth';

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

const STATE_COOKIE = 'rn_oauth';
const STATE_MAX_AGE = 600;  // 10 minutit — voog kestab sekundeid, mitte tunde

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
}

/** Sisselogimine on olemas ainult siis, kui võtmed on seadistatud. */
export function googleConfig(env: {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}): GoogleConfig | null {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return null;
  return { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET };
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomToken(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

async function sha256Base64url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return base64url(new Uint8Array(digest));
}

function redirectUri(request: Request): string {
  return `${new URL(request.url).origin}/api/auth/callback`;
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}

/**
 * Samm 1: saada kasutaja Google'i juurde.
 *
 * `state` kaitseb võltsitud tagasituleku eest, `code_verifier` (PKCE) selle eest,
 * et keegi vahepeal koodi kinni püüaks. Mõlemad hoitakse lühiajalises küpsises,
 * sest Workeril ei ole seansimälu, kuhu neid muidu panna.
 */
export async function startGoogleLogin(request: Request, config: GoogleConfig): Promise<Response> {
  const state = randomToken();
  const verifier = randomToken();
  const challenge = await sha256Base64url(verifier);

  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', redirectUri(request));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('prompt', 'select_account');

  const response = new Response(null, { status: 302, headers: { location: url.toString() } });
  response.headers.append(
    'Set-Cookie',
    `${STATE_COOKIE}=${state}.${verifier}; Path=/api/auth; Max-Age=${STATE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
  );
  return response;
}

interface GoogleIdentity {
  sub: string;
  name: string | null;
}

/** id_token tuleb otse Google'i token-otspunktist üle TLS-i, mitte brauseri kaudu,
 *  nii et allkirja eraldi kontrollima ei pea (OpenID Connect 3.1.3.7). Meid huvitab
 *  ainult `sub` — püsiv konto tunnus, mis ei muutu ka meiliaadressi vahetusel. */
function decodeIdToken(idToken: string): GoogleIdentity {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new ApiError(502, 'Google saatis arusaamatu vastuse.');

  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const json = JSON.parse(
    new TextDecoder().decode(Uint8Array.from(atob(payload), (c) => c.charCodeAt(0))),
  ) as { sub?: string; name?: string; email?: string };

  if (!payload || !json.sub) throw new ApiError(502, 'Google ei tagastanud kasutaja tunnust.');
  return { sub: json.sub, name: json.name ?? json.email ?? null };
}

async function exchangeCode(
  request: Request,
  config: GoogleConfig,
  code: string,
  verifier: string,
): Promise<GoogleIdentity> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri(request),
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
  });

  if (!res.ok) {
    console.error('Google token vahetus ebaõnnestus:', res.status, await res.text());
    throw new ApiError(502, 'Google\'iga sisselogimine ebaõnnestus.');
  }

  const body = await res.json() as { id_token?: string };
  if (!body.id_token) throw new ApiError(502, 'Google ei tagastanud id_token\'it.');
  return decodeIdToken(body.id_token);
}

/**
 * Tõstab anonüümselt antud hinded konto alla.
 *
 * Kui kontol on samale loole juba hinne, jääb see kehtima — konto on tugevam tõde
 * kui brauseriküpsis. Puudutatud lugude koondnäitajad arvutatakse uuesti, sest
 * ühendamisel võib hindeid ka vähemaks jääda (kaks hinnet muutuvad üheks).
 */
async function mergeAnonymousRatings(
  db: D1Database,
  fromUserId: string,
  toUserId: string,
): Promise<void> {
  if (fromUserId === toUserId) return;

  const { results } = await db
    .prepare('SELECT song_id FROM ratings WHERE user_id = ?')
    .bind(fromUserId)
    .all<{ song_id: string }>();

  const songIds = results.map((r) => r.song_id);
  if (songIds.length === 0) {
    await db.prepare('DELETE FROM users WHERE id = ?').bind(fromUserId).run();
    return;
  }

  await db.batch([
    db.prepare(`
      INSERT INTO ratings (user_id, song_id, score, created_at, updated_at)
      SELECT ?1, song_id, score, created_at, updated_at FROM ratings WHERE user_id = ?2
      ON CONFLICT(user_id, song_id) DO NOTHING
    `).bind(toUserId, fromUserId),
    db.prepare('DELETE FROM ratings WHERE user_id = ?').bind(fromUserId),
    db.prepare('DELETE FROM users WHERE id = ?').bind(fromUserId),
    ...songIds.map((songId) => db.prepare(`
      INSERT INTO song_stats (song_id, cnt, total)
      VALUES (
        ?1,
        (SELECT COUNT(*) FROM ratings WHERE song_id = ?1),
        (SELECT COALESCE(SUM(score), 0) FROM ratings WHERE song_id = ?1)
      )
      ON CONFLICT(song_id) DO UPDATE SET cnt = excluded.cnt, total = excluded.total
    `).bind(songId)),
  ]);
}

/**
 * Samm 2: Google saatis kasutaja tagasi.
 *
 * Tagastab kasutaja-ID, mille külge küpsis tuleb siduda — see EI ole tingimata
 * seesama anonüümne ID, millega inimene tuli: kui kontoga on juba varem hinnatud,
 * läheb ta tagasi oma vana konto peale.
 */
export async function finishGoogleLogin(
  request: Request,
  db: D1Database,
  config: GoogleConfig,
  anonymousUserId: string,
  cookieSecret: string,
): Promise<Response> {
  const url = new URL(request.url);

  const googleError = url.searchParams.get('error');
  if (googleError) throw new ApiError(400, `Google keeldus: ${googleError}`);

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) throw new ApiError(400, 'Puudulik vastus Google\'ilt.');

  const stored = readCookie(request, STATE_COOKIE);
  if (!stored) throw new ApiError(400, 'Sisselogimine aegus. Proovi uuesti.');

  const sep = stored.indexOf('.');
  const expectedState = stored.slice(0, sep);
  const verifier = stored.slice(sep + 1);
  if (sep < 0 || expectedState !== state) {
    throw new ApiError(403, 'Sisselogimise kontroll ebaõnnestus.');
  }

  const google = await exchangeCode(request, config, code, verifier);
  const now = Date.now();

  const existing = await db
    .prepare('SELECT id FROM users WHERE google_sub = ?')
    .bind(google.sub)
    .first<{ id: string }>();

  let userId: string;
  if (existing) {
    // Tuttav konto — too selle brauseri anonüümsed hinded kaasa.
    userId = existing.id;
    await mergeAnonymousRatings(db, anonymousUserId, userId);
    await db
      .prepare('UPDATE users SET display_name = ? WHERE id = ?')
      .bind(google.name, userId)
      .run();
  } else {
    // Esimene sisselogimine — praegusest anonüümsest kasutajast saab konto,
    // nii et tema seniseid hindeid ei pea kuhugi tõstma.
    userId = anonymousUserId;
    await db.prepare(`
      INSERT INTO users (id, google_sub, display_name, created_at)
      VALUES (?1, ?2, ?3, ?4)
      ON CONFLICT(id) DO UPDATE SET google_sub = ?2, display_name = ?3
    `).bind(userId, google.sub, google.name, now).run();
  }

  const response = new Response(null, { status: 302, headers: { location: '/minu-hinded' } });
  response.headers.append('Set-Cookie', await identityCookie(userId, cookieSecret));
  response.headers.append(
    'Set-Cookie',
    `${STATE_COOKIE}=; Path=/api/auth; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
  );
  return response;
}

/** Väljalogimine kustutab küpsise. Järgmisel päringul saab brauser uue anonüümse ID. */
export function logout(): Response {
  const response = new Response(null, { status: 302, headers: { location: '/' } });
  response.headers.append(
    'Set-Cookie',
    'rn_uid=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
  );
  return response;
}
