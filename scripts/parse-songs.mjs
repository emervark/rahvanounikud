// Eraldab saadete kirjeldustest hinnatud lugude nimekirjad.
//
// Enamik osi järgib sama mustrit:
//
//   Saatejuht Raul Saaremetsa valikul hinnati järgmisi lugusid:
//   nublu, Vaiko Eplik „Tipus ulub tuul”
//   Lorde „Man of the Year”
//   Milline lugu võitis? Kuula podcastist!
//
// Feedi tegelikkus on räpasem ja parser peab taluma vähemalt neid:
//   - ebaühtlased jutumärgid (》„ “ ” "《), kohati paaritud või sulgemata
//   - üle kahe rea murtud lugu ("Gorillaz feat Omar Souleyman & Yasiin" / "Bey “Damaskus”")
//   - puuduv tühik artisti ja pealkirja vahel (Elisabeth Tiffany“jopetaskud”)
//   - proosavormis erisaated, kus nimekirja üldse pole
//
// Kõik kahtlane läheb raportisse. Vaikselt vale rea läbilaskmine oleks halvem kui
// selle käsitsi ülevaatamine — vale artist tähendaks vale Spotify linki ja
// lõpuks hindeid vale loo küljes.

import fs from 'node:fs/promises';
import { paths } from './lib/paths.mjs';

/** Rida, mis tutvustab lugude nimekirja. */
const INTRO = /(hinnati|hinnatakse|hindamiseks|arvustamiseks|ette mängiti)[^\n]{0,60}?(lugusid|lugu|lood|palad)/i;

/** Read, mille juures nimekiri kindlasti läbi on. Rida võib alata jutumärgiga. */
const STOP = /^["„“”«]?(milline lugu|millised lood|millise kriitiku|kuula |muusikanõunik|jälgi |saade on salvestatud|toetajad|saatejuht|kriitik )/i;

/** Kes lood valis, nt „Saatejuht Raul Saaremetsa valikul …”. */
const CHOOSER = /Saatejuht\s+([A-ZÕÄÖÜŠŽ][\wõäöüšž-]+)\s+([A-ZÕÄÖÜŠŽ][\wõäöüšž-]+?)a?\s+valikul/i;

/** Külaliskriitik(ud). */
const GUEST = /külaliskriitik(?:uks|uteks|ud)\s+(?:on\s+)?([^.!?\n]{3,120})/i;

// NB: ülakomad ‘ ja ’ EI ole siin meelega — need esinevad ingliskeelsetes
// pealkirjades sõna sees ("We’re All The Same", "I’m a Man") ja lõhuksid pealkirja pooleks.
const QUOTE_CHARS = '„“”‟«»"';
const isQuote = (ch) => QUOTE_CHARS.includes(ch);
const hasQuote = (s) => [...s].some(isQuote);

const HOSTS = ['Raul Saaremets', 'Valner Valme', 'Siim Nestor', 'Merit Maarits'];

/** Kui palju ridu pärast intro't maksimaalselt vaadata, kui STOP-rida puudub. */
const MAX_LIST_LINES = 20;

/**
 * Artistiväli, mis on pigem lause kui esitajanimi → rida tuli proosast, mitte nimekirjast.
 * Nt "Kriitik Siim Nestor on teistele hindamiseks kaasa võtnud Eesti päris uue artisti iiori loo".
 */

/* Koma esitajate vahel, aga mitte esitaja nime sees. „Tyler, the Creator" on
   üks esitaja; „ONYX, pluuto" on kaks. Vahe on selles, mis komale järgneb:
   grammatiline jätkusõna väiketähega ei alusta uut nime. Eesnimi võib ka
   väiketähega olla (nublu, boipepperoni), seega väiketäht üksi ei piisa —
   loeb sõnaloend.

   Vale tükeldamine ei riku kuvatavat nime (selleks on artistsRaw), aga saadab
   otsingu valele jäljele: „Tyler" leidis Spotifyst „Kris Tyleri" ja lehele
   läks vale lugu. */
const CONTINUATION = /^(the|and|of|de|du|da|di|la|le|el|van|von|dos|das)\s/;

export function splitArtists(raw) {
  const parts = raw.split(/\s*,\s*/);
  const merged = [];
  for (const part of parts) {
    if (merged.length > 0 && CONTINUATION.test(part)) {
      merged[merged.length - 1] += `, ${part}`;
    } else {
      merged.push(part);
    }
  }
  return merged
    .flatMap((a) => a.split(/\s+(?:ja|feat\.?|&)\s+/i))
    .map((a) => a.trim())
    .filter(Boolean);
}

function looksLikeProse(song) {
  // Artistiväli on terve lause. Lävendid on meelega lõdvad: pikad feat-nimekirjad
  // nagu "The Avalanches ft Nikki Nair, Jessy Lanza & Prentiss" on päris artistiväljad.
  const artist = song.artistsRaw;
  if (artist.length > 70 || artist.split(/\s+/).length > 12) return true;

  // Pealkirja järel jätkub pikk lause → tsitaat proosast, mitte nimekirjarida.
  // Nt: Podcast „Muusikanõunikud” lõpetab sel nädalal sügis-talvise hooaja ning …
  if (song.note && song.note.length > 30) return true;

  return false;
}

/**
 * Üks nimekirjarida → { artistsRaw, title, note }.
 * Tagastab null, kui rida ei sisalda jutumärkides pealkirja.
 */
export function parseSongLine(raw) {
  const line = raw.trim().replace(/^[-–—•*\d.)\s]+/, '').trim();
  if (!line) return null;

  const chars = [...line];
  const first = chars.findIndex(isQuote);
  if (first < 0) return null;

  let second = -1;
  for (let i = first + 1; i < chars.length; i++) {
    if (isQuote(chars[i])) { second = i; break; }
  }

  const artists = chars.slice(0, first).join('').replace(/[\s,;–-]+$/, '').trim();

  // Sulgemata jutumärk (Glasser “Knave (DJ Python Remix) → pealkiri on rea lõpuni.
  const title = (second < 0 ? chars.slice(first + 1) : chars.slice(first + 1, second))
    .join('').trim();
  const note = second < 0 ? '' : chars.slice(second + 1).join('').replace(/^[\s,;.–-]+/, '').trim();

  if (!artists || !title) return null;

  return {
    artists: splitArtists(artists),
    artistsRaw: artists,
    title,
    note: note || null,
    unclosedQuote: second < 0 || undefined,
  };
}

/**
 * Nimekirjaplokk → read, kus üle kahe rea murtud lood on kokku liidetud.
 * "Gorillaz feat Omar Souleyman & Yasiin" + "Bey “Damaskus”" → üks rida.
 *
 * Nimekirjaplokis on jutumärgita rida definitsiooni järgi eelmise loo järg, sest
 * pealkiri on alati jutumärkides. Nii tulevad õigesti kokku ka pikad esitajaloendid:
 *   "Jamie xx feat Kelsey Ly, Panda Bear" + "John Glacier „Dafodil”"
 *   → Jamie xx, Kelsey Lu, John Glacier, Panda Bear — "Dafodil" (üks lugu, mitte kaks)
 *
 * Liidetud read märgitakse ära ja jõuavad raportisse, sest liitmine on ainus koht,
 * kus parser päris otsuse teeb — seda tasub silmaga üle vaadata.
 */
function joinWrappedLines(lines) {
  const out = [];
  let carry = '';

  for (const line of lines) {
    if (!hasQuote(line)) {
      carry = carry ? `${carry} ${line}` : line;
      continue;
    }
    out.push(carry ? { text: `${carry} ${line}`, wrapped: true } : { text: line });
    carry = '';
  }
  if (carry) out.push({ text: carry });  // rippuma jäänud rida → raportisse
  return out;
}

function extractEpisode(ep) {
  const lines = ep.description.split('\n');
  const introIdx = lines.findIndex((l) => INTRO.test(l));

  const result = {
    guid: ep.guid,
    title: ep.title,
    publishedAt: ep.publishedAt,
    chooser: null,
    guests: [],
    songs: [],
    unparsedLines: [],
    status: 'ok',
  };

  const guestMatch = ep.description.match(GUEST);
  if (guestMatch) {
    result.guests = guestMatch[1]
      .replace(/\s+(?:ning|ja)\s+/gi, ',')
      .split(',')
      .map((g) => g.replace(/^(muusik|laulja|kriitik|produtsent|helilooja|saksofonist|räppar|kirjamees)\s+/i, '').trim())
      .filter((g) => /^[A-ZÕÄÖÜŠŽ]/.test(g) && g.length < 40);
  }

  if (introIdx < 0) {
    result.status = 'intro-puudub';
    return result;
  }

  const introLine = lines[introIdx];
  const chooserMatch = introLine.match(CHOOSER);
  if (chooserMatch) {
    // „Raul Saaremetsa valikul” — omastav kääne tagasi nimetavaks.
    const [, first, last] = chooserMatch;
    result.chooser = HOSTS.find((h) => h.startsWith(first) && h.includes(last)) ?? `${first} ${last}`;
  }

  // Nimekirjaplokk: intro'st kuni STOP-reani.
  const block = [];
  for (let i = introIdx + 1; i < lines.length && block.length < MAX_LIST_LINES; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (STOP.test(line)) break;
    block.push(line);
  }

  for (const { text, wrapped } of joinWrappedLines(block)) {
    const song = parseSongLine(text);
    if (song) result.songs.push(wrapped ? { ...song, wrapped: true } : song);
    else result.unparsedLines.push(text);
  }

  // Proosavormis erisaade: parser "leidis" lugusid, aga tegelikult on need laused.
  // Parem anda selline osa käsitsi sisestamisse kui lasta rämps andmestikku.
  // Üksik lugu koos parsimata ridadega on samuti proosa tunnus — nimekirjas on
  // alati mitu lugu, sest saate mõte ongi neid omavahel võrrelda.
  const isProse = result.songs.some(looksLikeProse)
    || (result.songs.length === 1 && result.unparsedLines.length > 0);

  if (isProse) {
    result.status = 'proosa-vorm';
    result.rejectedSongs = result.songs;
    result.songs = [];
  } else if (result.songs.length === 0) {
    result.status = 'lugusid-ei-leitud';
  }

  return result;
}

function buildReport(parsed) {
  const totalSongs = parsed.reduce((n, e) => n + e.songs.length, 0);
  const failed = parsed.filter((e) => e.status !== 'ok');
  const odd = parsed.filter((e) => e.status === 'ok' && (e.songs.length < 3 || e.songs.length > 6));
  const unclosed = parsed.flatMap((e) =>
    e.songs.filter((s) => s.unclosedQuote).map((s) => ({ e, s })));
  const withNotes = parsed.flatMap((e) =>
    e.songs.filter((s) => s.note && s.note.length > 3).map((s) => ({ e, s })));
  const wrapped = parsed.flatMap((e) =>
    e.songs.filter((s) => s.wrapped).map((s) => ({ e, s })));
  const unparsed = parsed.flatMap((e) => e.unparsedLines.map((l) => ({ e, l })));

  const section = (rows, empty = '_Puuduvad._') => (rows.length ? rows : [empty]);

  return [
    '# Parsimise raport',
    '',
    `Saateid: **${parsed.length}** · lugusid: **${totalSongs}**`,
    `Automaatselt õnnestus: **${parsed.length - failed.length}/${parsed.length}**`,
    '',
    '## Vajavad käsitsi sisestamist → `data/overrides.json`',
    '',
    ...section(failed.map((e) =>
      `- \`${e.guid}\` · **${e.status}** · ${e.publishedAt.slice(0, 10)} — ${e.title}`)),
    '',
    '## Ebatavaline lugude arv (vaata üle)',
    '',
    ...section(odd.map((e) =>
      `- **${e.songs.length} lugu** · ${e.publishedAt.slice(0, 10)} — ${e.title}`)),
    '',
    '## Üle mitme rea murtud lood, mille parser kokku liitis (kontrolli üle)',
    '',
    ...section(wrapped.map(({ e, s }) =>
      `- \`${e.guid.slice(0, 8)}\` ${s.artistsRaw} — **${s.title}**`)),
    '',
    '## Sulgemata jutumärk (pealkiri võib olla katkine)',
    '',
    ...section(unclosed.map(({ e, s }) =>
      `- \`${e.guid.slice(0, 8)}\` ${s.artistsRaw} — **${s.title}**`)),
    '',
    '## Pealkirja järel jäänud tekst (kas osa pealkirjast?)',
    '',
    ...section(withNotes.map(({ e, s }) =>
      `- \`${e.guid.slice(0, 8)}\` ${s.artistsRaw} — ${s.title} → _${s.note}_`)),
    '',
    '## Read, mida ei õnnestunud parsida',
    '',
    ...section(unparsed.map(({ e, l }) => `- \`${e.guid.slice(0, 8)}\` ${l}`)),
    '',
  ].join('\n');
}

async function main() {
  const episodes = JSON.parse(await fs.readFile(paths.rawEpisodes, 'utf8'));
  const parsed = episodes.map(extractEpisode);

  await fs.writeFile(paths.parsed, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
  await fs.writeFile(paths.parseReport, buildReport(parsed), 'utf8');

  const totalSongs = parsed.reduce((n, e) => n + e.songs.length, 0);
  const failed = parsed.filter((e) => e.status !== 'ok');

  console.log(`${parsed.length} saadet, ${totalSongs} lugu → ${paths.parsed}`);
  console.log(`Automaatselt õnnestus: ${parsed.length - failed.length}/${parsed.length}`);
  if (failed.length) {
    console.log('\nKäsitsi vaja sisestada:');
    for (const e of failed) {
      console.log(`  - [${e.status}] ${e.publishedAt.slice(0, 10)} ${e.title.slice(0, 58)}`);
    }
  }
  console.log(`\nRaport: ${paths.parseReport}`);
}

main().catch((err) => {
  console.error('parse-songs ebaõnnestus:', err.message);
  process.exit(1);
});
