import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getArtistNames } from '../data';

/**
 * Lehevahetuse kate: ekraan täitub hetkeks esitajanimedega ja tühjeneb siis
 * uuesti, uus leht juba all.
 *
 * Nimed on päris — needsamad esitajad, keda saadetes kuulatud on. Nii ei ole
 * üleminek tühi efekt: iga kord jookseb silmist läbi see, millest kogu leht
 * koosneb. Juhuslik täitumis- ja kadumisjärjekord teeb, et kaks üleminekut
 * ei näe kunagi ühesugused välja.
 *
 * Kate ei püüa hiirt (pointer-events: none) — kui keegi klikib ülemineku
 * ajal, läheb klikk läbi juba kohal oleva lehe peale.
 */

const TONES = ['pink', 'sage', 'gold', 'lav', 'cream', 'ink'];

/* Enne kui episodes.json kohale jõuab, ei ole päris nimesid veel. Esimene
   laadimine kasutab seda nimekirja — needki on saadetest, mitte väljamõeldud. */
const FALLBACK = [
  'Florian Wahl', 'Karl Killing', 'villemdrillem', 'maria kallastu',
  'Jarek Kasar', 'Vaiko Eplik', 'Playboi Carti', 'Luurel Varas',
  'Tommy Cash', 'Alonette', 'margiiela', 'boipepperoni', 'An-Marlen',
  'Vera Vice', 'Drake', 'Benakanister', 'Prodigyboys', 'pluuto',
  'Skrillex', 'Smerz', 'Dean Blunt', 'Freak Street', 'Lotey',
  'Leslie Da Bass', 'Morrissey', 'Lana Del Rey', 'nublu', 'Lorde',
];

const CHAR = 8.6;      // Space Mono 14px tähelaius
const ROW = 30;        // reavahe
const IN_MAX = 260;    // täitumine hajub siia sisse
const OUT_MIN = 420;   // kadumine algab varem kui täitumine lõpeb — voolav
const OUT_SPAN = 250;
const TOTAL = 900;     // kate eemaldatakse päriselt alles pärast seda

interface Chip {
  text: string;
  x: number;
  y: number;
  tone: string;
  enter: number;
  exit: number;
}

function build(): Chip[] {
  const names = getArtistNames();
  const pool = names.length > 20 ? names : FALLBACK;
  const w = window.innerWidth;
  const rows = Math.ceil(window.innerHeight / ROW) + 1;
  const chips: Chip[] = [];

  for (let r = 0; r < rows; r++) {
    // Iga rida algab eri kohast, muidu tekiks vasakule serva sirge veerg.
    let x = -Math.random() * 220;
    while (x < w) {
      const text = pool[(Math.random() * pool.length) | 0];
      chips.push({
        text,
        x,
        y: r * ROW,
        tone: TONES[(Math.random() * TONES.length) | 0],
        enter: Math.random() * IN_MAX,
        exit: OUT_MIN + Math.random() * OUT_SPAN,
      });
      x += text.length * CHAR + 16 + Math.random() * 150;
    }
  }
  return chips;
}

export function PageTransition() {
  const { pathname } = useLocation();
  const [chips, setChips] = useState<Chip[] | null>(null);
  const [pass, setPass] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setChips(build());
    setPass((n) => n + 1);
    const t = window.setTimeout(() => setChips(null), TOTAL);
    return () => window.clearTimeout(t);
  }, [pathname]);

  if (!chips) return null;

  return (
    <div className="pt" key={pass} aria-hidden="true">
      {chips.map((c, i) => (
        <span
          key={i}
          className={`pt__w pt__w--${c.tone}`}
          style={{
            left: c.x,
            top: c.y,
            ['--enter' as string]: `${c.enter.toFixed(0)}ms`,
            ['--exit' as string]: `${c.exit.toFixed(0)}ms`,
          }}
        >
          {c.text}
        </span>
      ))}
    </div>
  );
}
