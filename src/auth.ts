// Anonüümne, aga püsiv identiteet.
//
// Hindamine peab käima ilma sisselogimiseta — muidu jääb enamik kuulajaid hindamata.
// Samas peab üks inimene saama ühe hääle loo kohta, nii et brauserile antakse
// allkirjastatud küpsis. Allkiri takistab kellelgi lihtsalt suvalist kasutaja-ID-d
// välja mõelda ja teise inimese hindeid üle kirjutada.
//
// See EI ole tugev autentimine: küpsist saab kustutada ja uue saada. Tugevam
// identiteet tuleb etapis 4 valikulise Google'i sisselogimisega.

const COOKIE_NAME = 'rn_uid';
const MAX_AGE = 60 * 60 * 24 * 730;  // 2 aastat

export interface Identity {
  userId: string;
  /** Tõene, kui küpsis on uus ja tuleb vastusega kaasa panna. */
  isNew: boolean;
}

function base64url(bytes: ArrayBuffer): string {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return base64url(sig);
}

/** Ajakindel võrdlus — lühis annaks allkirja äraarvamiseks vihjeid. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
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

/** Loeb küpsisest kasutaja või teeb uue. Andmebaasi rida tekib alles esimesel hindel. */
export async function resolveIdentity(request: Request, secret: string): Promise<Identity> {
  const raw = readCookie(request, COOKIE_NAME);

  if (raw) {
    const sep = raw.lastIndexOf('.');
    if (sep > 0) {
      const userId = raw.slice(0, sep);
      const signature = raw.slice(sep + 1);
      if (timingSafeEqual(signature, await sign(userId, secret))) {
        return { userId, isNew: false };
      }
    }
  }

  return { userId: crypto.randomUUID(), isNew: true };
}

export async function identityCookie(userId: string, secret: string): Promise<string> {
  const value = `${userId}.${await sign(userId, secret)}`;
  return `${COOKIE_NAME}=${value}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}

/** Paneb vastusele küpsise, kui identiteet oli äsja loodud. */
export async function withIdentity(
  response: Response,
  identity: Identity,
  secret: string,
): Promise<Response> {
  if (!identity.isNew) return response;
  const withCookie = new Response(response.body, response);
  withCookie.headers.append('Set-Cookie', await identityCookie(identity.userId, secret));
  return withCookie;
}
