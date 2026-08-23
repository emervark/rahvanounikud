/**
 * Sektsioonimärgis: väike ekvalaiser + silt.
 *
 * Enne oli siin järjenumber (01, 02, 03), aga number ei ütle midagi — ta oli
 * lihtsalt loendur. Ekvalaiser ütleb, et tegu on muusikaga, ja liikumine annab
 * lehele ainsa koha, kus midagi elab.
 *
 * Ribad on eri kõrgusega ka seisvas olekus, nii et prefers-reduced-motion
 * puhul jääb alles ekvalaiser, mitte neli ühesugust pulka.
 */
export function SectionTag({ label }: { label: string }) {
  return (
    <span className="tag">
      <span className="tag__mark" aria-hidden="true">
        <i /><i /><i /><i />
      </span>
      <span className="tag__label">{label}</span>
    </span>
  );
}
