import { useEffect } from 'react';

/**
 * Toob sisu kerimisel sisse: element algab veidi all ja läbipaistvana ning
 * tõuseb kohale, kui ta vaatevälja jõuab.
 *
 * Nähtavust arvutatakse `getBoundingClientRect`-iga, mitte
 * IntersectionObserveriga. Vaatleja on küll odavam, aga tema tagasiside
 * sõltub sellest, kas brauser peab lehte nähtavaks — taustavahekaardis või
 * mõnes manuses ta lihtsalt vaikib. Siis jääksid read igaveseks opacity 0
 * peale ja leht oleks tühi. Nähtamatu leht on halvem kui üleliigne
 * ristkülikupäring, seega arvutame ise.
 *
 * Uusi elemente jälgitakse MutationObserveriga: lehed renderdavad esmalt
 * laadimisoleku ja sisu tuleb alles pärast episodes.json-i, nii et
 * ühekordne päring jõuaks kohale enne sisu.
 *
 * Viivitus antakse partii sees, mitte lehe indeksi järgi — korraga sisse
 * kerivad read kaskaadivad, aga sada rida allpool ei päri sada korda
 * viivitust. Edetabelis on ridu 376.
 *
 * Klassid võetakse pärast animatsiooni maha, sest lõppolek `transform: none`
 * jääks muidu hover-nihete ette. Maha võtab kas `transitionend` või
 * varuajastus — kui üleminek mingil põhjusel ei käivitu, ei tohi element
 * sinna kinni jääda.
 */
const TARGETS = '.panel, .song, .disp, .chart-row, .shead, .stat-row, .comments';
const MARK = 'data-rev';
const MARGIN = 0.94;  /* alumine 6% ei loe veel — rida tõuseb sisse enne, kui pilk temani jõuab */
const STEP = 50;      /* kaskaadi samm partii sees */
const MAX_STEP = 8;

/* Projektil on üks tsconfig nii Workeri kui lehe peale ja
   @cloudflare/workers-types toob kaasa HTMLRewriteri oma `Element`i, mis
   varjab DOM-i oma. Kirjeldame vajaliku ise, nii ei sõltu fail sellest,
   kumb `Element` parajasti peale jääb. */
type El = {
  classList: { add(c: string): void; remove(...c: string[]): void };
  style: { setProperty(k: string, v: string): void; removeProperty(k: string): void };
  getBoundingClientRect(): { top: number; bottom: number; height: number };
  matches(sel: string): boolean;
  hasAttribute(a: string): boolean;
  setAttribute(a: string, v: string): void;
  removeAttribute(a: string): void;
  addEventListener(t: string, fn: () => void, o?: { once: boolean }): void;
  querySelectorAll(sel: string): ArrayLike<El> & Iterable<El>;
  nodeType: number;
};

export function useScrollReveal(): void {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let pending: El[] = [];
    const touched: El[] = [];
    const timers: number[] = [];
    let queued = false;

    function reveal(el: El, index: number): void {
      const delay = Math.min(index, MAX_STEP) * STEP;
      el.style.setProperty('--rev', `${delay}ms`);
      el.classList.add('is-in');
      const clear = () => {
        el.classList.remove('rev', 'is-in');
        el.style.removeProperty('--rev');
      };
      el.addEventListener('transitionend', clear, { once: true });
      timers.push(window.setTimeout(clear, delay + 800));
    }

    function sweep(): void {
      queued = false;
      if (pending.length === 0) return;
      const limit = window.innerHeight * MARGIN;
      const rest: El[] = [];
      let i = 0;
      for (const el of pending) {
        const r = el.getBoundingClientRect();
        /* Ainult ülemine serv loeb. Kui element on juba vaateväljast üles
           välja keritud, tuleb ta kohe nähtavaks teha — muidu jääks kiiresti
           mööda keritud sisu igaveseks peitu ja ilmuks alles siis, kui keegi
           juhtub tagasi kerima. */
        if (r.top < limit) {
          reveal(el, i);
          i++;
        } else {
          rest.push(el);
        }
      }
      pending = rest;
    }

    function schedule(): void {
      if (queued) return;
      queued = true;
      requestAnimationFrame(sweep);
    }

    function add(el: El): void {
      if (el.hasAttribute(MARK)) return;
      el.setAttribute(MARK, '');
      el.classList.add('rev');
      pending.push(el);
      touched.push(el);
    }

    function watch(root: El): void {
      for (const el of root.querySelectorAll(TARGETS)) add(el);
    }

    watch(document as unknown as El);
    schedule();

    const mo = new MutationObserver((records) => {
      for (const rec of records) {
        for (const node of rec.addedNodes) {
          if (node.nodeType !== 1) continue;
          const el = node as unknown as El;
          if (el.matches(TARGETS)) add(el);
          watch(el);
        }
      }
      schedule();
    });
    mo.observe(document.body as unknown as Node, { childList: true, subtree: true });

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    return () => {
      mo.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      for (const t of timers) window.clearTimeout(t);
      /* Kui hook maha võetakse, ei tohi ükski element peitu jääda. Märgis
         tuleb samuti maha, muidu jääks ta uuel paigaldusel vahele — Reacti
         range režiim paigaldab efekti arenduses kaks korda. */
      for (const el of touched) {
        el.classList.remove('rev', 'is-in');
        el.style.removeProperty('--rev');
        el.removeAttribute(MARK);
      }
    };
  }, []);
}
