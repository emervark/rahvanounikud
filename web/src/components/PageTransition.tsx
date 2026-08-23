import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getArtistNames } from '../data';

/**
 * Lehevahetuse kate: ekraan täitub esitajanimedega, leht vahetub katte all
 * ära ja kate tühjeneb siis juba uue lehe pealt.
 *
 * Kate haarab lingiklikid endale, mitte ei reageeri aadressimuutusele.
 * Reageeriv variant vahetas lehe kohe ja alles siis hakkas kate täituma —
 * vahetus jäi katte alt paistma. Nüüd on järjekord õige: täitu, vaheta,
 * tühjene.
 *
 * Kastid on täpselt sama suured kui päise navipunktid ja üks ridadest on
 * nendega ühel joonel. Nii ei ole kate lehe peal võõras kiht vaid sama
 * ruudustik, millest päis koosneb. Mõõdud võetakse jooksvalt päisest, nii
 * et see peab paika ka mobiilis.
 *
 * Read on flex-konteinerid ja sõnad pakitakse ilma vaheta. Vahedega jääks
 * lehevahetus lünkade vahelt paistma; nüüd on kate täitumise lõpuks
 * läbipaistmatu.
 *
 * Nimed on päris — needsamad esitajad, keda saadetes kuulatud on. Nii ei ole
 * üleminek tühi efekt: iga kord jookseb silmist läbi see, millest kogu leht
 * koosneb.
 */

const TONES = ['pink', 'sage', 'gold', 'lav', 'cream', 'ink'];

/* Enne kui episodes.json kohale jõuab, päris nimesid veel ei ole. Esimene
   laadimine kasutab seda nimekirja — needki on saadetest, mitte välja mõeldud. */
const FALLBACK = [
  'Florian Wahl', 'Karl Killing', 'villemdrillem', 'maria kallastu',
  'Jarek Kasar', 'Vaiko Eplik', 'Playboi Carti', 'Luurel Varas',
  'Tommy Cash', 'Alonette', 'margiiela', 'boipepperoni', 'An-Marlen',
  'Vera Vice', 'Drake', 'Benakanister', 'Prodigyboys', 'pluuto',
  'Skrillex', 'Smerz', 'Dean Blunt', 'Freak Street', 'Lotey',
  'Leslie Da Bass', 'Morrissey', 'Lana Del Rey', 'nublu', 'Lorde',
];

/* Space Mono 11px, tähevahe 1,4px — sama mis navipunktil. Seda kasutatakse
   ainult selleks, et teada, mitu sõna reale mahub; tegeliku laiuse annab flex. */
const CHAR = 8;
const PAD = 20;

/* Kestused antakse CSS-i muutujatena katte külge, nii et neid on ainult ühes
   kohas. Varem seisid samad numbrid ka styles.css-is ja oleksid vaikselt
   lahku läinud. */
const IN_DUR = 220;
const OUT_DUR = 200;

/* Hajuvus: mitme millisekundi peale kastide algused laiali külvatakse. Koos
   kestusega annab see kaskaadi pikkuse. Lai hajuvus ja pikk kestus hoiavad
   liikumist nähtaval — kitsa vahega jõudsid viimased kastid paika enne,
   kui silm neid märgata jõuab. */
const ENTER_SPREAD = 340;
const EXIT_SPREAD = 320;

/* Kui kaua hoiame täiesti kaetud ekraani pärast seda, kui viimane sõna
   kohale jõudis. */
const HOLD = 110;

/* Tühjenemise pikkus: viimane sõna alustab EXIT_SPREADi lõpus ja tal kulub
   veel OUT_DUR. */
const OUT = EXIT_SPREAD + OUT_DUR + 20;

/* Millal on kate täis.

   Kellast klikini seda arvutada ei saa: neljasaja kasti renderdamine ja
   esimene joonistus jõudsid klikist umbes sada millisekundit hiljem ja
   vahetus tabas poolikut katet. Nüüd loeme aega esimesest animationstardist
   — sealt on viimane sõna kohal ENTER_SPREAD + IN_DUR pärast, millele
   lisame kaadrijagu varu.

   Loendasime enne animationend-sündmusi ja ootasime, kuni kõik neljasada
   kohale jõuavad. See jäi kinni iga kord, kui mõne sündmuse kaotsiminekuks
   piisas põhjust — uks puudu ja kate jäi ekraanile varuvariandi ajastuseni.
   Üks ankur on kindlam kui nelisada. */
const FILL_AFTER_START = ENTER_SPREAD + IN_DUR + 60;

/* Viimane luuk: kui animatsiooni ei alanudki, ei tohi navigeerimine rippuma
   jääda. */
const FILL_MAX = 1600;

interface Word {
  text: string;
  tone: string;
  enter: number;
  exit: number;
}

interface Row {
  y: number;
  left: number;
  words: Word[];
}

interface Cover {
  rows: Row[];
  box: number;
}

function build(): Cover {
  const names = getArtistNames();
  const pool = names.length > 20 ? names : FALLBACK;

  /* Ruudustik tuleb päisest, mitte konstandist: navipunkti kõrgus ja ülemine
     serv määravad nii kasti suuruse kui selle, kus read algavad. */
  const nav = document.querySelector('.navl');
  const r = nav?.getBoundingClientRect();
  const box = r && r.height > 8 ? r.height : 34;
  const anchor = r ? r.top : 16;

  const w = window.innerWidth;
  const h = window.innerHeight;

  /* Nihutame ruudustikku ülespoole, kuni esimene rida jääb ekraanist välja.
     Nii katavad read kogu kõrguse ja üks neist langeb täpselt navipunktide
     joonele. */
  const start = anchor - Math.ceil((anchor + 1) / box) * box;
  const count = Math.ceil((h - start) / box);

  const rows: Row[] = [];
  for (let i = 0; i < count; i++) {
    /* Iga rida algab eri kohast, muidu tekiks vasakusse serva sirge veerg. */
    const left = -Math.round(Math.random() * box * 6);
    const need = w - left;
    const words: Word[] = [];
    let filled = 0;
    /* Täidame üle ääre, et rida lõpeks kindlasti ekraanist väljas. */
    while (filled < need) {
      const text = pool[(Math.random() * pool.length) | 0];
      words.push({
        text,
        tone: TONES[(Math.random() * TONES.length) | 0],
        enter: Math.round(Math.random() * ENTER_SPREAD),
        exit: Math.round(Math.random() * EXIT_SPREAD),
      });
      filled += text.length * CHAR + PAD;
    }
    rows.push({ y: start + i * box, left, words });
  }

  return { rows, box };
}

/** Kas see klikk on tavaline sisenavigatsioon, mille võime endale võtta? */
function internalTarget(e: MouseEvent): string | null {
  if (e.defaultPrevented || e.button !== 0) return null;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;

  const start = e.target as { closest?(sel: string): unknown } | null;
  const a = start?.closest?.('a[href]') as {
    href: string;
    target: string;
    getAttribute(n: string): string | null;
  } | null;
  if (!a) return null;
  if (a.target && a.target !== '_self') return null;
  if (a.getAttribute('download') !== null) return null;

  const url = new URL(a.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  /* Sama leht — vahetust ei toimu, katet pole vaja. */
  if (url.pathname === window.location.pathname && url.search === window.location.search) {
    return null;
  }

  return url.pathname + url.search + url.hash;
}

export function PageTransition() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [cover, setCover] = useState<Cover | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [pass, setPass] = useState(0);

  const busy = useRef(false);
  const timers = useRef<number[]>([]);

  /* Katte täitumise seis. */
  const started = useRef(false);
  const full = useRef(false);
  const pendingGo = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  }, []);

  /** Ekraan on täis: nüüd tohib leht vahetuda ja kate hakata tühjenema. */
  const covered = useCallback(() => {
    if (full.current) return;
    full.current = true;

    pendingGo.current?.();
    pendingGo.current = null;

    timers.current.push(window.setTimeout(() => setLeaving(true), HOLD));
    timers.current.push(window.setTimeout(() => {
      setCover(null);
      busy.current = false;
    }, HOLD + OUT));
  }, []);

  /**
   * Käivitab katte. `go` antakse siis, kui vahetuse teeme ise — siis toimub
   * see katte all. Tagasi-nupu ja esmalaadimise puhul on leht juba vahetunud
   * ja kate lihtsalt pühib üle.
   */
  const run = useCallback((go?: () => void) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      go?.();
      return;
    }
    stop();
    busy.current = true;
    full.current = false;
    started.current = false;
    pendingGo.current = go ?? null;

    setCover(build());
    setLeaving(false);
    setPass((n) => n + 1);

    timers.current.push(window.setTimeout(covered, FILL_MAX));
  }, [stop, covered]);

  /* Animatsioonisündmused mullitavad katte juurde. Esimene neist ütleb,
     millal kate päriselt liikuma hakkas; sealt edasi on täitumise lõpp
     teada. */
  const onFirstStart = useCallback(() => {
    if (started.current || full.current) return;
    started.current = true;
    timers.current.push(window.setTimeout(covered, FILL_AFTER_START));
  }, [covered]);

  /* Lingiklikid võetakse püüdefaasis, enne kui React Router nendeni jõuab. */
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (busy.current) return;
      const to = internalTarget(e);
      if (!to) return;
      e.preventDefault();
      e.stopPropagation();
      run(() => navigate(to));
    }
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [navigate, run]);

  /* Esmalaadimine ja tagasi-nupp: vahetus on juba tehtud, kate pühib üle. */
  useEffect(() => {
    if (!busy.current) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  /* Mahavõtmisel tuleb ka lipp langetada, mitte ainult ajastid kustutada.
     Viide elab Reacti range režiimi taaspaigalduse üle; kui lipp jääb
     püsti ja ajastid kaovad, jääb kate ekraanile ja klikke ei püüa enam
     keegi kinni. */
  useEffect(() => () => {
    stop();
    busy.current = false;
  }, [stop]);

  if (!cover) return null;

  return (
    <div
      className={leaving ? 'pt pt--out' : 'pt pt--in'}
      key={pass}
      aria-hidden="true"
      onAnimationStart={leaving ? undefined : onFirstStart}
      style={{
        ['--in-dur' as string]: `${IN_DUR}ms`,
        ['--out-dur' as string]: `${OUT_DUR}ms`,
      }}
    >
      {cover.rows.map((row, ri) => (
        <div
          className="pt__row"
          key={ri}
          style={{ top: row.y, left: row.left, height: cover.box }}
        >
          {row.words.map((word, wi) => (
            <span
              key={wi}
              className={`pt__w pt__w--${word.tone}`}
              style={{
                ['--enter' as string]: `${word.enter}ms`,
                ['--exit' as string]: `${word.exit}ms`,
              }}
            >
              {word.text}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
