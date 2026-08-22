// Testid loo äratundmisele.
//
// Juhtumid on võetud päris andmestikust — eesti täpitähed, feat-koosseisud,
// remiksid, ülakomad. Iga rida on midagi, mis päriselt kirjelduses esineb.
//
// Käivita: node scripts/test-match.mjs

import { CONFIDENCE_THRESHOLD, pickBest, scoreCandidate } from './lib/match.mjs';

const results = [];

function song(artists, title) {
  return { artists, title };
}

/** Peab leidma just selle kandidaadi ja olema piisavalt kindel. */
function shouldMatch(name, s, candidates, expectedId) {
  const { best } = pickBest(s, candidates);
  const ok = best && best.score >= CONFIDENCE_THRESHOLD && best.candidate.id === expectedId;
  results.push({
    name, ok,
    detail: best
      ? `sai ${best.candidate.id} (${best.score.toFixed(2)}), ootasin ${expectedId}`
      : 'ei leidnud midagi',
  });
}

/** Ei tohi ühtegi kandidaati piisavalt kindlaks pidada. */
function shouldReject(name, s, candidates) {
  const { best } = pickBest(s, candidates);
  const ok = !best || best.score < CONFIDENCE_THRESHOLD;
  results.push({
    name, ok,
    detail: best
      ? `pidas kindlaks: ${best.candidate.id} (${best.score.toFixed(2)}), piir on ${CONFIDENCE_THRESHOLD}`
      : 'ei leidnud midagi (õige)',
  });
}

// ── Lihtne täistabamus ─────────────────────────────────────────────────────
shouldMatch('täpne vaste',
  song(['Lorde'], 'Man of the Year'),
  [{ id: 'oige', title: 'Man of the Year', artists: ['Lorde'] }],
  'oige');

// ── Eesti täpitähed ────────────────────────────────────────────────────────
shouldMatch('täpitähed pealkirjas',
  song(['Vaiko Eplik'], 'Oh jeerum'),
  [
    { id: 'vale', title: 'Oh jeerum (Live)', artists: ['Keegi Muu'] },
    { id: 'oige', title: 'Oh jeerum', artists: ['Vaiko Eplik & Eliit'] },
  ],
  'oige');

shouldMatch('õ ja ä artistis ja pealkirjas',
  song(['Kaisa Ling Thing'], 'Elu naisteta on jant'),
  [{ id: 'oige', title: 'Elu naisteta on jant', artists: ['Kaisa Ling Thing'] }],
  'oige');

// ── feat-koosseisud kirjutatakse igal pool erinevalt ────────────────────────
shouldMatch('meil "ft", Spotifys eraldi artistid',
  song(['Charli XCX', 'Bladee'], 'Rewind'),
  [{ id: 'oige', title: 'Rewind', artists: ['Charli xcx', 'Bladee'] }],
  'oige');

shouldMatch('pikk feat-loend',
  song(['The Avalanches', 'Nikki Nair', 'Jessy Lanza', 'Prentiss'], 'Together'),
  [{ id: 'oige', title: 'Together', artists: ['The Avalanches', 'Nikki Nair', 'Jessy Lanza', 'Prentiss'] }],
  'oige');

// ── Ülakomad ───────────────────────────────────────────────────────────────
shouldMatch('ülakoma pealkirjas',
  song(['Kim Gordon'], 'I’m a Man'),
  [{ id: 'oige', title: "I'm a Man", artists: ['Kim Gordon'] }],
  'oige');

// ── Remiksid: KÕIGE OHTLIKUM koht ──────────────────────────────────────────
shouldMatch('remiks leiab remiksi',
  song(['Roma Vjazemski'], 'Royal Brown (Philipp Otterbach Full Nelson Remix)'),
  [
    { id: 'originaal', title: 'Royal Brown', artists: ['Roma Vjazemski'] },
    { id: 'remiks', title: 'Royal Brown - Philipp Otterbach Full Nelson Remix', artists: ['Roma Vjazemski'] },
  ],
  'remiks');

shouldMatch('originaal ei tohi valida remiksi',
  song(['Glasser'], 'Knave'),
  [
    { id: 'remiks', title: 'Knave (DJ Python Remix)', artists: ['Glasser'] },
    { id: 'originaal', title: 'Knave', artists: ['Glasser'] },
  ],
  'originaal');

// ── Nõrk lisand: sama lugu, teine pakend ───────────────────────────────────
shouldMatch('Radio Edit on ikkagi sama lugu',
  song(['Vera Vice'], 'Tell Me, Tell Me'),
  [{ id: 'oige', title: 'Tell Me, Tell Me - Radio Edit', artists: ['Vera Vice'] }],
  'oige');

shouldMatch('Remastered on ikkagi sama lugu',
  song(['Cardiacs'], 'Busty Beez'),
  [{ id: 'oige', title: 'Busty Beez - 2024 Remaster', artists: ['Cardiacs'] }],
  'oige');

shouldMatch('originaal eelistatakse Radio Editile, kui mõlemad olemas',
  song(['Vera Vice'], 'Tell Me, Tell Me'),
  [
    { id: 'edit', title: 'Tell Me, Tell Me - Radio Edit', artists: ['Vera Vice'] },
    { id: 'originaal', title: 'Tell Me, Tell Me', artists: ['Vera Vice'] },
  ],
  'originaal');

shouldReject('live-esitus ei asenda originaali',
  song(['Turnstile'], 'I Care'),
  [{ id: 'live', title: 'I Care - Live at Wembley', artists: ['Turnstile'] }]);

// ── Spotify paneb kaasesitaja pealkirja sisse ──────────────────────────────
shouldMatch('"featuring X" pealkirjas',
  song(['Charli XCX', 'John Cale'], 'House'),
  [{ id: 'oige', title: 'House featuring John Cale', artists: ['Charli xcx', 'John Cale'] }],
  'oige');

shouldMatch('selgitav lisa pealkirja lõpus',
  song(['Olev Muska'], 'Chastushka II'),
  [{ id: 'oige', title: 'Chastushka II | A Village Party Song II', artists: ['Olev Muska'] }],
  'oige');

shouldReject('eesliide ilma eraldajata ei klapi',
  song(['Keegi'], 'Summer'),
  [{ id: 'vale', title: 'Summer Rain', artists: ['Keegi'] }]);

shouldReject('eesliide ei tohi klappida sõna sees',
  song(['Keegi'], 'House'),
  [{ id: 'vale', title: 'Housework', artists: ['Keegi'] }]);

// ── Üks sõna vale = teine lugu, ka kui tähed on sarnased ───────────────────
shouldReject('Computer Blue ei ole Computer Love',
  song(['Romare'], 'Computer Blue'),
  [{ id: 'vale', title: 'Computer Love', artists: ['Romare'] }]);

shouldReject('üks sõna kahest vale',
  song(['Keegi'], 'Summer Rain'),
  [{ id: 'vale', title: 'Summer Sun', artists: ['Keegi'] }]);

// ── Kirjaviga meie pool EI tohi vastet ära lõhkuda ─────────────────────────
shouldMatch('üks puuduv täht on kirjaviga, mitte teine lugu',
  song(['Jill Scott', 'Too $hort'], 'BPTY'),
  [{ id: 'oige', title: 'BPOTY (feat. Too $hort)', artists: ['Jill Scott', 'Too $hort'] }],
  'oige');

// ── Sama tähed, teine sõnajaotus ───────────────────────────────────────────
shouldMatch('kokkukirjutatud vs lahku',
  song(['Florian Wahl'], 'FBsõbrad'),
  [{ id: 'oige', title: 'FB sõbrad', artists: ['Florian Wahl'] }],
  'oige');

shouldMatch('ülakoma ümber tühik',
  song(['Beyoncé'], 'TEXAS HOLD’EM'),
  [{ id: 'oige', title: "TEXAS HOLD 'EM", artists: ['Beyonce'] }],
  'oige');

// ── Sama pealkiri, vale artist ─────────────────────────────────────────────
shouldReject('sama pealkiri, täiesti vale artist',
  song(['Skuuba'], 'Kuidas sul on läind?'),
  [{ id: 'vale', title: 'Kuidas sul on läind?', artists: ['Tundmatu Bänd'] }]);

// ── Kaverid ────────────────────────────────────────────────────────────────
shouldReject('kaver ei ole originaal',
  song(['A-ha'], 'Take On Me'),
  [{ id: 'kaver', title: 'Take On Me', artists: ['Elina Nechayeva'] }]);

// ── Otsing ei leidnud midagi lähedast ──────────────────────────────────────
shouldReject('täiesti muu lugu',
  song(['iiori'], 'sprint'),
  [{ id: 'muu', title: 'Sprinter', artists: ['Dave', 'Central Cee'] }]);

shouldReject('tühi tulemus', song(['Keegi'], 'Miski'), []);

// ── Väiketähelised artistinimed (esineb sageli) ────────────────────────────
shouldMatch('väiketähtedega artist',
  song(['villemdrillem', 'Liis Lemsalu'], 'Kas tuled ka?'),
  [{ id: 'oige', title: 'Kas tuled ka?', artists: ['villemdrillem', 'Liis Lemsalu'] }],
  'oige');

shouldMatch('punktidega artistinimi',
  song(['jonas.f.k.'], 'Nädal'),
  [{ id: 'oige', title: 'Nädal', artists: ['jonas f.k.'] }],
  'oige');

// ── Ø ja muud erimärgid ────────────────────────────────────────────────────
shouldMatch('Ø artistinimes',
  song(['SKIZØ'], '2kätt'),
  [{ id: 'oige', title: '2kätt', artists: ['SKIZO'] }],
  'oige');

// ── Väike kirjaviga pealkirjas (kirjeldustes esineb) ───────────────────────
shouldMatch('kirjaviga pealkirjas',
  song(['John Glacier'], 'Dafodil'),
  [{ id: 'oige', title: 'Dafodil', artists: ['Jamie xx', 'Kelsey Lu', 'John Glacier', 'Panda Bear'] }],
  'oige');

// ── Kokkuvõte ──────────────────────────────────────────────────────────────
let failed = 0;
for (const r of results) {
  if (r.ok) {
    console.log(`  OK   ${r.name}`);
  } else {
    failed++;
    console.log(`  VIGA ${r.name}`);
    console.log(`       ${r.detail}`);
  }
}
console.log(`\n${results.length - failed}/${results.length} testi läbis`);

// Näidiseks paar hinnet, et piiri oleks lihtsam häälestada
console.log('\nHinded võrdluseks (piir on ' + CONFIDENCE_THRESHOLD + '):');
const samples = [
  ['täpne vaste', song(['Lorde'], 'Man of the Year'), { title: 'Man of the Year', artists: ['Lorde'] }],
  ['vale artist', song(['Skuuba'], 'Kuidas sul on läind?'), { title: 'Kuidas sul on läind?', artists: ['Tundmatu Bänd'] }],
  ['remiks vs originaal', song(['Glasser'], 'Knave'), { title: 'Knave (DJ Python Remix)', artists: ['Glasser'] }],
];
for (const [label, s, c] of samples) {
  console.log(`  ${scoreCandidate(s, c).toFixed(2)}  ${label}`);
}

process.exit(failed === 0 ? 0 : 1);
