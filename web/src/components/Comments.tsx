import { useState } from 'react';
import { SectionTag } from './SectionTag';
import {
  MAX_BODY, MAX_NAME, formatWhen, saveDisplayName, useComments,
} from '../comments';
import { useRatings } from '../ratings';

/**
 * Nimeküsimine.
 *
 * Ilmub alles siis, kui inimene tahab päriselt kommenteerida — nime küsimine
 * ette oleks tõke, mida enamik ei ületa. Hindamine ei nõua nime üldse.
 */
function NamePrompt({ onSaved }: { onSaved: (name: string) => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onSaved(await saveDisplayName(name));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nime salvestamine ebaõnnestus.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="namebox" onSubmit={submit}>
      <div className="mono">Kommenteerimiseks vali nimi</div>
      <p className="note-text namebox__note">
        Nimi on nähtav kommentaari juures. Seda saab hiljem muuta ja see ei ole
        konto — kui tahad, et kommentaarid jääksid sinu külge ka teises seadmes,
        logi Google'iga sisse.
      </p>
      <div className="namebox__row">
        <input
          className="search-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_NAME}
          placeholder="Nt Mari või muusikasõber"
          aria-label="Sinu nimi"
        />
        <button className="btn solid" type="submit" disabled={busy || name.trim().length < 2}>
          {busy ? 'Salvestan…' : 'Salvesta'}
        </button>
      </div>
      {error && <p className="note-text namebox__error">{error}</p>}
    </form>
  );
}

function CommentForm({
  onSubmit,
  busy,
  initial = '',
  onCancel,
}: {
  onSubmit: (body: string) => void;
  busy: boolean;
  initial?: string;
  onCancel?: () => void;
}) {
  const [body, setBody] = useState(initial);
  const left = MAX_BODY - body.length;

  return (
    <form
      className="cform"
      onSubmit={(e) => { e.preventDefault(); onSubmit(body.trim()); if (!onCancel) setBody(''); }}
    >
      <textarea
        className="cform__field"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={MAX_BODY}
        rows={onCancel ? 3 : 3}
        placeholder="Mis sa sellest loost arvad?"
        aria-label="Kommentaar"
      />
      <div className="cform__foot">
        <span className="mono" style={{ color: left < 100 ? 'var(--accent-ink)' : undefined }}>
          {left} märki jäänud
        </span>
        <span style={{ display: 'flex', gap: 8 }}>
          {onCancel && (
            <button type="button" className="btn" onClick={onCancel}>Loobu</button>
          )}
          <button className="btn solid" type="submit" disabled={busy || body.trim().length === 0}>
            {busy ? 'Saadan…' : onCancel ? 'Salvesta' : 'Postita'}
          </button>
        </span>
      </div>
    </form>
  );
}

export function Comments({
  songId,
  heading = true,
}: {
  songId: string;
  /** Saate lehel istub lõim loo sees, kus eraldi sektsioonipäis oleks üleliigne. */
  heading?: boolean;
}) {
  const { comments, error, needsName, busy, add, edit, remove, setNeedsName } = useComments(songId);
  const { displayName, isLoggedIn, loginAvailable } = useRatings();
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(displayName);

  const hasName = Boolean(name ?? displayName);

  return (
    <section>
      {heading && (
        <div className="shead">
          <SectionTag num="03" label="Kommentaarid" />
          <span className="mono note">
            {comments === null ? 'Laen…' : `${comments.length} tk`}
          </span>
        </div>
      )}

      <div className={heading ? 'comments' : 'comments comments--inline'}>
        {error && <p className="note-text comments__error">{error}</p>}

        {comments !== null && comments.length === 0 && (
          <p className="note-text comments__empty">
            Ühtegi kommentaari veel. Ütle esimesena, mis sa arvad.
          </p>
        )}

        {(comments ?? []).map((c) => (
          <article className="comment" key={c.id}>
            <div className="comment__head mono">
              <b className="comment__author">{c.authorName}</b>
              {c.isLoggedIn && <span title="Sisse logitud kasutaja">✓</span>}
              <span>{formatWhen(c.createdAt)}</span>
              {c.editedAt && <span>· muudetud</span>}
              {c.isMine && (
                <span className="comment__actions">
                  <button type="button" onClick={() => setEditing(c.id)}>muuda</button>
                  <button type="button" onClick={() => remove(c.id)}>kustuta</button>
                </span>
              )}
            </div>

            {editing === c.id ? (
              <CommentForm
                busy={busy}
                initial={c.body}
                onCancel={() => setEditing(null)}
                onSubmit={async (body) => {
                  if (body && await edit(c.id, body)) setEditing(null);
                }}
              />
            ) : (
              <p className="comment__body">{c.body}</p>
            )}
          </article>
        ))}

        {needsName || !hasName ? (
          <NamePrompt onSaved={(n) => { setName(n); setNeedsName(false); }} />
        ) : (
          <CommentForm busy={busy} onSubmit={(body) => { if (body) add(body); }} />
        )}

        {hasName && loginAvailable && !isLoggedIn && (
          <p className="note-text comments__hint">
            Kommenteerid nimega <b>{name ?? displayName}</b>. See on seotud selle
            brauseriga — <a href="/api/auth/google">logi Google'iga sisse</a>, kui tahad,
            et kommentaarid jääksid sinu külge ka mujal.
          </p>
        )}
      </div>
    </section>
  );
}
