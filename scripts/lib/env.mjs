// Loeb võtmed .dev.vars failist (või keskkonnamuutujatest).
//
// Build-aegsed skriptid kasutavad sama faili mis kohalik Worker, et võtmeid ei
// peaks kahte kohta panema. .dev.vars on .gitignore's.

import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './paths.mjs';

let cache = null;

function readDevVars() {
  if (cache) return cache;
  cache = {};

  const file = path.join(ROOT, '.dev.vars');
  if (!fs.existsSync(file)) return cache;

  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    cache[key] = value;
  }
  return cache;
}

/** Keskkonnamuutuja võidab .dev.vars üle (nt CI jaoks). */
export function readEnv(name) {
  return process.env[name] || readDevVars()[name] || null;
}

/** Nõuab võtit ja sureb selge sõnumiga, kui puudub. */
export function requireEnv(names, juhend) {
  const missing = names.filter((n) => !readEnv(n));
  if (missing.length === 0) return names.map((n) => readEnv(n));

  console.error(`Puuduvad võtmed: ${missing.join(', ')}\n`);
  console.error(`Lisa need faili .dev.vars:\n`);
  for (const n of missing) console.error(`  ${n}=...`);
  if (juhend) console.error(`\n${juhend}`);
  process.exit(1);
}
