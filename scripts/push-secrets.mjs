// Saadab .secrets.json failis olevad võtmed Cloudflare'i.
//
// Miks failist, mitte terminalist: PowerShellis ei kleebi Ctrl+V, vaid sisestab
// juhtmärgi 0x16. "wrangler secret put" võtab selle rõõmsalt vastu ja salvestab
// võtme asemel ühe juhtmärgi — deploy õnnestub, leht paistab korras ja alles
// sisse logides tuleb Google'ilt arusaamatu viga. Failist lugedes seda ei juhtu.
//
// Käivita: npm run secrets:push

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { ROOT } from './lib/paths.mjs';

const FILE = path.join(ROOT, '.secrets.json');

/** Märgid, mida päris võtmes kunagi ei ole, aga katkine kleepimine tekitab. */
function findControlChars(value) {
  const bad = [];
  for (const ch of value) {
    const code = ch.codePointAt(0);
    if (code < 0x20 || code === 0x7f) {
      bad.push('0x' + code.toString(16).padStart(2, '0'));
    }
  }
  return bad;
}

function validate(name, value) {
  if (typeof value !== 'string') return `${name}: väärtus peab olema tekst`;
  if (value.trim() === '') return `${name}: väärtus on tühi`;
  if (value !== value.trim()) return `${name}: alguses või lõpus on tühik`;
  if (/^siia-/.test(value)) return `${name}: näidisväärtus on asendamata`;

  const bad = findControlChars(value);
  if (bad.length) {
    return `${name}: sisaldab juhtmärke (${bad.join(', ')}) — `
      + 'tõenäoliselt kleebiti terminali Ctrl+V-ga. Kleebi väärtus tekstiredaktoris.';
  }
  if (value.length < 8) return `${name}: kahtlaselt lühike (${value.length} märki)`;
  return null;
}

function main() {
  if (!fs.existsSync(FILE)) {
    console.error('Faili .secrets.json ei ole.\n');
    console.error('Tee koopia näidisest ja täida see tekstiredaktoris:');
    console.error('  cp .secrets.example.json .secrets.json');
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (err) {
    console.error('.secrets.json ei ole korrektne JSON:', err.message);
    process.exit(1);
  }

  // Alakriipsuga algavad võtmed on kommentaarid, mitte saladused.
  const entries = Object.entries(parsed).filter(([name]) => !name.startsWith('_'));

  if (entries.length === 0) {
    console.error('.secrets.json ei sisalda ühtegi võtit.');
    process.exit(1);
  }

  const problems = entries.map(([n, v]) => validate(n, v)).filter(Boolean);
  if (problems.length) {
    console.error('Võtmed ei ole korras — ei saada midagi üles:\n');
    for (const p of problems) console.error('  - ' + p);
    process.exit(1);
  }

  console.log(`Saadan ${entries.length} võtit Cloudflare'i...\n`);

  for (const [name, value] of entries) {
    const res = spawnSync(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['wrangler', 'secret', 'put', name],
      { input: value, encoding: 'utf8' },
    );

    if (res.status !== 0) {
      console.error(`  VIGA  ${name}`);
      console.error((res.stderr || res.stdout || '').trim().split('\n').slice(-4).join('\n'));
      process.exit(1);
    }
    // Väärtust ennast ei trüki kunagi — ainult pikkuse, et näha, et midagi läks.
    console.log(`  OK    ${name}  (${value.length} märki)`);
  }

  console.log('\nValmis. Nüüd:');
  console.log('  1. npm run deploy');
  console.log('  2. kustuta .secrets.json ära');
}

main();
