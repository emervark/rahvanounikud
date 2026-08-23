/** Laadimis- ja veaolek, mida iga leht andmete ootamise ajal näitab. */
export function PageState({ error }: { error: string | null }) {
  if (error) {
    return (
      <div className="error-box">
        <h2 style={{ fontSize: 20, marginBottom: 10 }}>Andmeid ei õnnestunud laadida</h2>
        <p className="mono" style={{ margin: 0 }}>{error}</p>
      </div>
    );
  }
  return <div className="loading mono">Laen saateid…</div>;
}
