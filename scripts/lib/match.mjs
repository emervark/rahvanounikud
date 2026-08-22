// Loo äratundmine otsingutulemuste hulgast.
//
// See on etapi 5 tegelik raskuskese. Vale tabamus on halvem kui puuduv tabamus:
// puuduva puhul näeb inimene otsingulinki ja saab ise otsida, vale puhul kuulab
// ta üht lugu ja hindab teist — ja keegi ei saa kunagi teada, et hinne on vale loo küljes.
//
// Seepärast: madal kindlus → jäta lahendamata ja saada ülevaatusraportisse.

const DIACRITICS = {
  õ: 'o', ä: 'a', ö: 'o', ü: 'u', š: 's', ž: 'z', ø: 'o', å: 'a',
  æ: 'ae', ß: 'ss', ð: 'd', þ: 'th', ł: 'l',
};

/** Võrdlemiseks: väiketähed, ilma diakriitikuta, ilma kirjavahemärkideta. */
export function normalize(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[õäöüšžøåæßðþł]/g, (c) => DIACRITICS[c] ?? c)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[''`´]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    // Levinud lühendid ühtlustatakse, sest meil ja Spotifys kirjutatakse neid
    // erinevalt: "St Etienne" vs "Saint Etienne".
    .replace(/\bst\b/g, 'saint')
    .replace(/\bmt\b/g, 'mount')
    .replace(/\bdr\b/g, 'doctor')
    .replace(/\bfeat\b|\bft\b/g, 'featuring')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sulgudes või sidekriipsu järel olev lisand: (Remix), - Radio Edit, [Live] jne.
 * Neid EI tohi lihtsalt ära visata — remiks on eri lugu kui originaal — aga
 * nende olemasolu/puudumine on kindluse hindamisel oluline signaal.
 */
export function splitVariant(title) {
  const m = String(title ?? '').match(/^(.*?)\s*[([\-–—]\s*(.+?)[)\]]?\s*$/);
  if (!m || !m[1].trim()) return { base: String(title ?? '').trim(), variant: null };
  return { base: m[1].trim(), variant: m[2].trim() };
}

/**
 * Kõik lisandid ei ole võrdsed.
 *
 * TUGEV lisand teeb loost teise loo: remiks on teise inimese töö, live on teine
 * esitus. Neid ei tohi omavahel segi ajada.
 *
 * NÕRK lisand on sama lugu teises pakendis: "Radio Edit" on lühem versioon,
 * "Remastered" on sama salvestus puhtamalt. Kui Spotifys on ainult "Radio Edit",
 * on see ikkagi õige lugu ja parem kui otsingulink.
 */
const STRONG_VARIANT = /\b(remix|live|acoustic|instrumental|demo|cover|reprise|dub|vip|rework|bootleg|karaoke|sped up|slowed)\b/i;
const WEAK_VARIANT = /\b(edit|version|remaster(ed)?|extended|single|album|radio|mono|stereo|explicit|clean)\b/i;

export function variantKind(variant) {
  if (!variant) return 'puudub';
  if (STRONG_VARIANT.test(variant)) return 'tugev';
  if (WEAK_VARIANT.test(variant)) return 'nork';
  return 'puudub';
}

export function isDistinctVariant(variant) {
  return variantKind(variant) === 'tugev';
}

/** Levenshteini kaugus, piiratud pikkusega — otsingutulemused on lühikesed. */
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = curr;
  }
  return prev[b.length];
}

/** 0..1 sarnasus. */
export function similarity(a, b) {
  const x = normalize(a);
  const y = normalize(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const dist = levenshtein(x, y);
  return Math.max(0, 1 - dist / Math.max(x.length, y.length));
}

/**
 * Kaasesitaja pealkirja sees: Spotify kirjutab sageli "House featuring John Cale",
 * kui meil on lihtsalt "House". See on esitaja info, mitte pealkirja osa.
 */
export function stripFeat(title) {
  return String(title ?? '')
    .replace(/\s*[([]?\s*\b(feat\.?|ft\.?|featuring|with)\b[^)\]]*[)\]]?\s*$/i, '')
    .trim() || String(title ?? '').trim();
}

/**
 * Kas üks pealkiri on teise algus sõnapiiril.
 *
 * Katab juhud, kus Spotify lisab pealkirjale selgituse:
 * "Chastushka II" vs "Chastushka II | A Village Party Song II".
 * Sõnapiiri nõue hoiab ära, et "House" klapiks sõnaga "Housework".
 */
export function isPrefixMatch(a, b) {
  const x = normalize(a);
  const y = normalize(b);
  if (!x || !y || x === y) return false;
  const [short, long] = x.length < y.length ? [x, y] : [y, x];
  if (short.length < 4) return false;
  return long.startsWith(short + ' ');
}

/**
 * Kas mõni meie artistidest esineb kandidaadi esitajate hulgas.
 *
 * Osaline kattuvus loeb, sest feat-koosseisud on kirja pandud väga erinevalt:
 * meil "Charli XCX ft Bladee", Spotifys artistid ["Charli xcx", "Bladee"].
 */
export function artistOverlap(ourArtists, theirArtists) {
  const ours = ourArtists.map(normalize).filter(Boolean);
  const theirs = theirArtists.map(normalize).filter(Boolean);
  if (ours.length === 0 || theirs.length === 0) return 0;

  let hits = 0;
  for (const a of ours) {
    const found = theirs.some((b) => b === a || b.includes(a) || a.includes(b)
      || similarity(a, b) > 0.85);
    if (found) hits++;
  }
  return hits / ours.length;
}

/**
 * Kandidaadi hinne 0..1.
 *
 * Pealkiri kaalub rohkem kui esitaja, sest esitajate kirjapilt erineb rohkem.
 * Variandi (remiks/live) mittevastavus on karm miinus — see teeb loost teise loo.
 */
export function scoreCandidate(song, candidate) {
  const ourSplit = splitVariant(song.title);
  const theirSplit = splitVariant(candidate.title);

  const titleFull = similarity(song.title, candidate.title);
  const titleBase = similarity(ourSplit.base, theirSplit.base);
  // Kaasesitajata võrdlus: "House" vs "House featuring John Cale".
  const titleNoFeat = similarity(stripFeat(song.title), stripFeat(candidate.title));
  // Selgitav lisa pealkirja lõpus: "Chastushka II | A Village Party Song II".
  const titlePrefix = isPrefixMatch(ourSplit.base, theirSplit.base) ? 0.9 : 0;

  const titleScore = Math.max(titleFull, titleBase * 0.95, titleNoFeat * 0.97, titlePrefix);

  const artistScore = artistOverlap(song.artists, candidate.artists);

  let score = titleScore * 0.65 + artistScore * 0.35;

  const ourKind = variantKind(ourSplit.variant);
  const theirKind = variantKind(theirSplit.variant);

  if (ourKind === 'tugev' && theirKind === 'tugev') {
    // Mõlemad remiksid — kas need on sama remiks?
    score += similarity(ourSplit.variant, theirSplit.variant) * 0.1 - 0.05;
  } else if (ourKind === 'tugev' || theirKind === 'tugev') {
    // Üks on remiks/live, teine mitte → eri lugu.
    score -= 0.3;
  } else if (ourKind !== theirKind) {
    // Ainult nõrk lahknevus (Radio Edit vs originaal) — sama lugu, kerge miinus.
    score -= 0.06;
  }

  // Esitaja ei klapi üldse → ei saa olla õige lugu, ükskõik kui sarnane pealkiri.
  if (artistScore === 0) score = Math.min(score, 0.45);

  return Math.max(0, Math.min(1, score));
}

/** Piir, millest allpool jäetakse lugu meelega lahendamata. */
export const CONFIDENCE_THRESHOLD = 0.72;

/** Parim kandidaat koos hindega, või null kui ükski pole piisavalt kindel. */
export function pickBest(song, candidates) {
  const scored = candidates
    .map((c) => ({ candidate: c, score: scoreCandidate(song, c) }))
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return { best: null, scored: [] };
  return { best: scored[0], scored };
}
