/**
 * Sektsioonimärgis: [04] PRODUCTS
 *
 * Number kastis, silt monos. Kordub kõigil lehtedel, nii et lugeja teab alati,
 * mitmes plokk see on — leht loeb kui nummerdatud kataloog.
 */
export function SectionTag({ num, label }: { num: string; label: string }) {
  return (
    <span className="tag">
      <span className="tag__num">{num}</span>
      <span className="tag__label">{label}</span>
    </span>
  );
}
