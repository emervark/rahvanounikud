import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEpisodesFile } from '../useData';
import { allSongs } from '../data';

/**
 * Sisemine statistika.
 *
 * Cloudflare Web Analytics ütleb, kui palju rahvast käis. See leht ütleb, mida
 * nad tegid — ja seda teab ainult meie oma andmebaas. Kolmandat osapoolt siin
 * ei ole.
 *
 * Leht on võtme taga ja lingitud ei ole kuskilt: kes aadressi ei tea, ei satu
 * siia. Võti ise elab localStorage'is, et seda ei peaks iga kord uuesti
 * kirjutama, ja käib serverisse päises — URL-id satuvad logidesse ja viitajasse,
 * päised mitte.
 */

const VÕTI = 'rn-stats-key';

interface Insights {
  generatedAt: number;
  kokku: {
    hindeid: number; hindajaid: number; hinnatudLugusid: number;
    kommentaare: number; kontoga: number; keskmine: number | null;
  };
  päevad: { päev: string; hindeid: number; hindajaid: number }[];
  jaotus: { hinne: number; mitu: number }[];
  top: { songId: string; keskmine: number; hääli: number }[];
  põhi: { songId: string; keskmine: number; hääli: number }[];
  vaieldud: { songId: string; keskmine: number; hääli: number; hajuvus: number }[];
  aktiivsus: { hindeid: number; hindajaid: number }[];
}

const arv = (n: number) => n.toLocaleString('et-EE');
const koma = (n: number | null, k = 1) =>
  n == null ? '—' : n.toFixed(k).replace('.', ',');

export function Stats() {
  const { data } = useEpisodesFile();
  const [key, setKey] = useState(() => localStorage.getItem(VÕTI) ?? '');
  const [sisend, setSisend] = useState('');
  const [insights, setInsights] = useState<Insights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [laeb, setLaeb] = useState(false);

  const lae = useCallback(async (k: string) => {
    setLaeb(true);
    setError(null);
    try {
      const res = await fetch('/api/insights', { headers: { authorization: `Bearer ${k}` } });
      if (res.status === 401) throw new Error('Vale võti.');
      if (!res.ok) {
        const b = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(b?.error ?? `Päring ebaõnnestus (${res.status})`);
      }
      setInsights(await res.json() as Insights);
      localStorage.setItem(VÕTI, k);
      setKey(k);
    } catch (e) {
      setInsights(null);
      setError(e instanceof Error ? e.message : 'Tundmatu viga.');
      /* Vale võtit ei ole mõtet alles hoida — muidu kordub sama viga igal
         lehe avamisel ja kasutaja ei saa aru, kust ta tuleb. */
      localStorage.removeItem(VÕTI);
    } finally {
      setLaeb(false);
    }
  }, []);

  useEffect(() => { if (key) void lae(key); }, [key, lae]);

  /* Loo ID-st inimloetav nimi. Sama fail on lehel niikuinii laetud. */
  const nimed = useMemo(() => {
    const m = new Map<string, string>();
    if (data) for (const { song } of allSongs(data)) m.set(song.id, `${song.artistsRaw} — ${song.title}`);
    return m;
  }, [data]);

  if (!insights) {
    return (
      <>
        <div className="pagehead">
          <div>
            <div className="mono" style={{ marginBottom: 14 }}>Sisemine vaade</div>
            <h1>Statistika</h1>
          </div>
        </div>
        <form
          className="empty"
          onSubmit={(e) => { e.preventDefault(); if (sisend.trim()) void lae(sisend.trim()); }}
        >
          <p className="mono">Sisesta võti.</p>
          <input
            className="search-input"
            type="password"
            autoComplete="off"
            value={sisend}
            onChange={(e) => setSisend(e.target.value)}
            aria-label="Statistika võti"
            style={{ maxWidth: 320 }}
          />
          <button className="btn solid" type="submit" disabled={laeb}>
            {laeb ? 'kontrollin…' : 'Ava'} <span className="arw">→</span>
          </button>
          {error && <p className="mono" style={{ color: 'var(--accent-ink)' }}>{error}</p>}
        </form>
      </>
    );
  }

  const { kokku, päevad, jaotus, top, põhi, vaieldud, aktiivsus } = insights;
  const suurimPäev = Math.max(1, ...päevad.map((p) => p.hindeid));
  const suurimHinne = Math.max(1, ...jaotus.map((j) => j.mitu));
  const ühekordsed = aktiivsus.find((a) => a.hindeid === 1)?.hindajaid ?? 0;
  const lugusidKokku = data?.stats.songs ?? 0;

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="mono" style={{ marginBottom: 14 }}>Sisemine vaade</div>
          <h1>Statistika</h1>
        </div>
        <div className="mono live" style={{ paddingBottom: 6 }}>
          {new Date(insights.generatedAt).toLocaleString('et-EE')}
        </div>
      </div>

      <div className="stat-row">
        <div><b>{arv(kokku.hindeid)}</b><span className="mono">hinnet antud</span></div>
        <div><b>{arv(kokku.hindajaid)}</b><span className="mono">hindajat</span></div>
        <div>
          <b>{arv(kokku.hinnatudLugusid)}</b>
          <span className="mono">
            hinnatud lugu{lugusidKokku ? ` / ${lugusidKokku}` : ''}
          </span>
        </div>
        <div><b>{koma(kokku.keskmine)}</b><span className="mono">keskmine hinne</span></div>
        <div><b>{arv(kokku.kommentaare)}</b><span className="mono">kommentaari</span></div>
        <div><b>{arv(kokku.kontoga)}</b><span className="mono">Google'i kontoga</span></div>
      </div>

      <Plokk pealkiri="Hindeid päevas" abi="viimased 30 päeva">
        {päevad.length === 0 ? <Tühi /> : (
          <div className="tulbad">
            {päevad.map((p) => (
              <div className="tulp" key={p.päev} title={`${p.päev}: ${p.hindeid} hinnet, ${p.hindajaid} hindajat`}>
                <span className="tulp__joon" style={{ height: `${(p.hindeid / suurimPäev) * 100}%` }} />
                <span className="tulp__silt mono">{p.päev.slice(8)}</span>
              </div>
            ))}
          </div>
        )}
      </Plokk>

      <Plokk pealkiri="Hinnete jaotus" abi="mitu korda iga hinne on antud">
        {jaotus.length === 0 ? <Tühi /> : (
          <div className="tulbad tulbad--lai">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((h) => {
              const rida = jaotus.find((j) => j.hinne === h);
              const mitu = rida?.mitu ?? 0;
              return (
                <div className="tulp" key={h} title={`${h}: ${mitu}`}>
                  <span className="tulp__arv mono">{mitu || ''}</span>
                  <span className="tulp__joon" style={{ height: `${(mitu / suurimHinne) * 100}%` }} />
                  <span className="tulp__silt mono">{h}</span>
                </div>
              );
            })}
          </div>
        )}
      </Plokk>

      <Plokk pealkiri="Kui palju keegi hindab" abi="hindajad hinnete arvu järgi">
        {aktiivsus.length === 0 ? <Tühi /> : (
          <p className="note">
            <b>{arv(ühekordsed)}</b> hindajat on andnud täpselt ühe hinde.{' '}
            Kõige agaram on andnud <b>{arv(Math.max(...aktiivsus.map((a) => a.hindeid)))}</b>.{' '}
            Mediaan on <b>{arv(mediaan(aktiivsus))}</b> hinnet hindaja kohta.
          </p>
        )}
      </Plokk>

      <Edetabel pealkiri="Rahva lemmikud" read={top} nimed={nimed} />
      <Edetabel pealkiri="Kõige madalamad" read={põhi} nimed={nimed} />
      <Edetabel pealkiri="Kõige vaieldavamad" abi="suurim hajuvus hinnetes" read={vaieldud} nimed={nimed} hajuvus />

      <div className="stat-row">
        <button
          className="btn"
          type="button"
          onClick={() => { localStorage.removeItem(VÕTI); setKey(''); setInsights(null); setSisend(''); }}
        >
          Unusta võti
        </button>
      </div>
    </>
  );
}

/** Mediaan täisarvude loendist, mis on juba hinnete arvu järgi järjestatud. */
function mediaan(aktiivsus: { hindeid: number; hindajaid: number }[]): number {
  const kokku = aktiivsus.reduce((n, a) => n + a.hindajaid, 0);
  if (kokku === 0) return 0;
  let seni = 0;
  for (const a of aktiivsus) {
    seni += a.hindajaid;
    if (seni >= kokku / 2) return a.hindeid;
  }
  return 0;
}

function Plokk({ pealkiri, abi, children }: {
  pealkiri: string; abi?: string; children: React.ReactNode;
}) {
  return (
    <section className="statplokk">
      <div className="shead">
        <h2>{pealkiri}</h2>
        {abi && <span className="mono note">{abi}</span>}
      </div>
      {children}
    </section>
  );
}

const Tühi = () => <p className="note mono">Andmeid veel ei ole.</p>;

function Edetabel({ pealkiri, abi, read, nimed, hajuvus }: {
  pealkiri: string;
  abi?: string;
  read: { songId: string; keskmine: number; hääli: number; hajuvus?: number }[];
  nimed: Map<string, string>;
  hajuvus?: boolean;
}) {
  return (
    <Plokk pealkiri={pealkiri} abi={abi}>
      {read.length === 0 ? <Tühi /> : (
        <ul className="statlist">
          {read.map((r, i) => (
            <li key={r.songId}>
              <span className="statlist__nr mono">{i + 1}</span>
              <Link className="statlist__nimi" to={`/lugu/${r.songId}`}>
                {nimed.get(r.songId) ?? r.songId}
              </Link>
              <span className="statlist__arv mono">
                {hajuvus ? `±${koma(r.hajuvus ?? 0, 2)}` : koma(r.keskmine)}
              </span>
              <span className="statlist__hääli mono">{r.hääli} h</span>
            </li>
          ))}
        </ul>
      )}
    </Plokk>
  );
}
