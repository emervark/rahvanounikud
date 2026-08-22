/** Laadimis- ja veaolek, mida iga leht andmete ootamise ajal näitab. */
export function PageState({ error }: { error: string | null }) {
  if (error) {
    return (
      <div className="page">
        <div className="error-box">
          <h2>Andmeid ei õnnestunud laadida</h2>
          <p className="muted">{error}</p>
        </div>
      </div>
    );
  }
  return <div className="loading">Laen saateid…</div>;
}
