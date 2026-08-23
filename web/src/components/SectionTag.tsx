/** Paleti toonid, mida sektsioonimärgis kanda saab. */
export type Tone = 'pink' | 'sage' | 'gold' | 'lav';

/**
 * Sektsioonimärgis: ruudukujuline värviline kast animeeritud ekvalaiseriga.
 *
 * Enne oli siin järjenumber (01, 02, 03), aga number ei ütle midagi — ta oli
 * lihtsalt loendur. Ekvalaiser ütleb, et tegu on muusikaga.
 *
 * Iga sektsioon saab oma tooni ja oma ribamustri, nii et märgised ei ole
 * korduv tempel vaid eristavad plokke — sama loogika mis päise värvilistel
 * tähemärgistel.
 *
 * Ribad on eri kõrgusega ka seisvas olekus, nii et prefers-reduced-motion
 * puhul jääb alles ekvalaiser, mitte neli ühesugust pulka.
 */
export function SectionTag({ label, tone = 'pink' }: { label: string; tone?: Tone }) {
  return (
    <span className="tag">
      <span className={`tag__mark tag__mark--${tone}`} aria-hidden="true">
        <i /><i /><i /><i />
      </span>
      <span className="tag__label">{label}</span>
    </span>
  );
}
