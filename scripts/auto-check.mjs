// Automaatika (GitHub Actions) värav: kas feedis on uus saade ja kas seda tohib
// ilma inimeseta avalikule lehele panna.
//
// Võrdleb värskelt ehitatud data/episodes.json-i viimase commit'i omaga.
// Kirjutab tulemuse GITHUB_OUTPUT-i ja Markdowni kokkuvõtte faili, mille
// workflow paneb issue sisuks.
//
//   status=none     uut saadet pole — midagi ei tehta
//   status=ok       uued saated on korras — avaldame
//   status=blocked  vähemalt üks uus saade vajab käsitsi tööd — EI avalda
//
// Miks blokeerime, mitte ei avalda poolikult: parsimata või kahtlase lugude
// arvuga saade tähendab peaaegu alati, et kirjeldus on proosas või erisaade.
// Vale lugu lehel kogub päris inimeste hindeid ja hiljem parandades jääksid
// need vale loo külge (vt README „Miks parser nii kahtlustav on").
//
// Käivita: node scripts/auto-check.mjs [--after-resolve]
//   --after-resolve  kirjuta kokkuvõttesse ka kuulamislinkide seis

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { paths } from './lib/paths.mjs';

const afterResolve = process.argv.includes('--after-resolve');
const SUMMARY_FILE = 'auto-summary.md';

function previousEpisodes() {
  try {
    const raw = execFileSync('git', ['show', `${process.env.AUTO_BASE || 'HEAD'}:data/episodes.json`], {
      encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    });
    return JSON.parse(raw).episodes;
  } catch {
    return [];
  }
}

const now = JSON.parse(fs.readFileSync(paths.episodes, 'utf8')).episodes;
const parsed = JSON.parse(fs.readFileSync(paths.parsed, 'utf8'));
const parseStatus = new Map(parsed.map((e) => [e.guid, e.status]));

const oldGuids = new Set(previousEpisodes().map((e) => e.guid));
// Saate number = järjekoht vanimast, nagu lehel.
const chronological = [...now].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
const numberOf = new Map(chronological.map((e, i) => [e.guid, i + 1]));

const fresh = now
  .filter((e) => !oldGuids.has(e.guid))
  .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));

/** Põhjus, miks saadet ei tohi automaatselt avaldada, või null. */
function problemOf(ep) {
  const status = parseStatus.get(ep.guid) ?? 'puudub';
  // overrides.json võib parsimata saate lood käsitsi anda — siis on korras.
  if (ep.songs.length === 0) return `lugusid ei leitud (parser: ${status})`;
  if (ep.songs.length < 3 || ep.songs.length > 6) return `ebatavaline lugude arv: ${ep.songs.length}`;
  return null;
}

let status = 'none';
const lines = [];

if (fresh.length > 0) {
  const problems = fresh.map((ep) => [ep, problemOf(ep)]).filter(([, p]) => p);
  status = problems.length > 0 ? 'blocked' : 'ok';

  if (status === 'blocked') {
    lines.push('Automaatika leidis uue saate, aga **ei avaldanud** seda, sest parser ei saanud lugudega kindlalt hakkama.', '');
    for (const [ep, p] of problems) {
      lines.push(`- **Saade ${numberOf.get(ep.guid)}** · ${ep.publishedAt.slice(0, 10)} — ${ep.title}`);
      lines.push(`  - probleem: ${p}`);
      lines.push(`  - guid: \`${ep.guid}\``);
    }
    lines.push('', 'Lisa lood käsitsi faili `data/overrides.json` (vt `data/parse-report.md`) ja tee `npm run data` + deploy.',
      'Kui see on tehtud, sulge see issue — järgmine automaatne käivitus jätkab tavapäraselt.');
  } else {
    let missing = 0;
    for (const ep of fresh) {
      lines.push(`### Saade ${numberOf.get(ep.guid)} · ${ep.publishedAt.slice(0, 10)}`, ep.title, '');
      for (const s of ep.songs) {
        const artists = s.artistsRaw ?? s.artists.join(', ');
        let links = '';
        if (afterResolve) {
          const got = [s.spotifyId && 'Spotify', s.youtubeId && 'YouTube'].filter(Boolean);
          if (got.length === 0) missing++;
          links = got.length ? ` — ${got.join(' + ')}` : ' — ⚠️ **link puudub**';
        }
        lines.push(`- ${artists} — ${s.title}${links}`);
      }
      lines.push('');
    }
    if (afterResolve && missing > 0) {
      lines.push(`**${missing} lool puudub kuulamislink** — vaata \`data/review-list.md\` / ülevaatuslehte.`, '');
    }
    lines.push('Nõunike hinded tuleb sisestada käsitsi (`data/critic-scores.json`).');
  }
}

fs.writeFileSync(SUMMARY_FILE, lines.join('\n') + '\n');

const title = fresh.length === 0 ? ''
  : fresh.length === 1
    ? `Saade ${numberOf.get(fresh[0].guid)}: ${fresh[0].title.split(':')[0].slice(0, 80)}`
    : `Saated ${fresh.map((e) => numberOf.get(e.guid)).join(', ')}`;

const out = { status, title, guids: fresh.map((e) => e.guid).join(' ') };
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT,
    Object.entries(out).map(([k, v]) => `${k}=${v}\n`).join(''));
}
console.log(`Uusi saateid: ${fresh.length} · staatus: ${status}${title ? ` · ${title}` : ''}`);
