import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PlushieDto } from '@koerbchen/shared';
import { api } from '../../lib/api';
import { qk } from '../../lib/queryKeys';
import { resizeImageToDataUrl } from '../../lib/image';
import { ErrorNote } from '../../lib/ErrorNote';
import { ListNote } from '../../lib/LoadState';
import { IconTeddy, IconPencil, IconTrash, IconChevronRight } from '../../lib/icons';

export function usePlushies(id: string) {
  return useQuery({ queryKey: qk.plushies(id), queryFn: () => api.listPlushies(id) });
}

const AVATAR_STYLE = {
  background: 'radial-gradient(circle at 34% 28%, var(--accent-soft), transparent 78%), var(--panel-1)',
  boxShadow: '0 0 0 1.5px rgba(255,255,255,0.08)',
  color: 'var(--accent)',
} as const;

function Avatar({
  plushie,
  className,
}: {
  plushie: Pick<PlushieDto, 'photo' | 'emoji'>;
  className: string;
}) {
  if (plushie.photo) {
    return (
      <img
        src={plushie.photo}
        alt=""
        className={`${className} shrink-0 rounded-lg object-cover shadow-[0_0_0_1.5px_var(--rim)]`}
      />
    );
  }
  return (
    <span
      className={`${className} emoji-token shrink-0 text-2xl`}
      style={AVATAR_STYLE}
    >
      {plushie.emoji || <IconTeddy className="h-7 w-7" />}
    </span>
  );
}

// The "Kuscheltiere" tab: one Steckbrief card per plushie, plus an add control.
export function PlushiesPanel({ koerbchenId }: { koerbchenId: string }) {
  const plushies = usePlushies(koerbchenId);
  const [adding, setAdding] = useState(false);
  const list = plushies.data ?? [];

  return (
    <>
      {list.map((p) => (
        <PlushieCard key={p.id} koerbchenId={koerbchenId} plushie={p} />
      ))}

      {adding ? (
        <PlushieForm koerbchenId={koerbchenId} onDone={() => setAdding(false)} />
      ) : (
        // An empty section still gets a tin. The label above is lit, and it has
        // to flood into a body — flooding into bare iron was the one place the
        // world's own rule broke, and it broke where the app is emptiest.
        <section className="panel p-6">
          {list.length === 0 && (
            <ListNote
              isError={plushies.isError}
              error={plushies.error}
              onRetry={() => void plushies.refetch()}
              empty="Noch keine Kuscheltiere. Leg den ersten Steckbrief an!"
            />
          )}
          <button
            onClick={() => setAdding(true)}
            className={`btn3d w-full py-3 text-sm ${list.length === 0 ? 'mt-4' : ''}`}
          >
            + Neues Kuscheltier
          </button>
        </section>
      )}
    </>
  );
}

function PlushieCard({ koerbchenId, plushie }: { koerbchenId: string; plushie: PlushieDto }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const del = useMutation({
    mutationFn: () => api.deletePlushie(koerbchenId, plushie.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.plushies(koerbchenId) }),
  });

  if (editing) {
    return (
      <PlushieForm koerbchenId={koerbchenId} plushie={plushie} onDone={() => setEditing(false)} />
    );
  }

  const hasDetails = Boolean(plushie.character || plushie.favorites || plushie.bio);

  return (
    <section className="panel p-5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3.5 text-left"
        aria-expanded={open}
      >
        <Avatar plushie={plushie} className="h-16 w-16" />
        <span className="min-w-0 flex-1">
          <span className="tin-label block truncate">
            {plushie.name}
          </span>
          {plushie.species && (
            <span className="mt-1 inline-block rounded-full bg-[color:var(--accent-soft)] px-2.5 py-0.5 text-xs font-bold text-[color:var(--accent-ink)]">
              {plushie.species}
            </span>
          )}
        </span>
        <IconChevronRight
          className={`h-5 w-5 shrink-0 text-[color:var(--muted)] transition-transform ${
            open ? 'rotate-90' : ''
          }`}
        />
      </button>

      {open && (
        <div className="mt-3 border-t border-[color:var(--line)] pt-3">
          {hasDetails ? (
            <div className="space-y-3">
              {plushie.character && <Detail label="charakter" value={plushie.character} />}
              {plushie.favorites && (
                <Detail label="lieblingsessen / hobbys" value={plushie.favorites} />
              )}
              {plushie.bio && <Detail label="steckbrief" value={plushie.bio} />}
            </div>
          ) : (
            <p className="text-sm text-[color:var(--muted)]">Noch nichts eingetragen.</p>
          )}

          <div className="mt-4 flex gap-2">
            <button onClick={() => setEditing(true)} className="btn3d-soft flex-1 py-2 text-sm">
              <IconPencil className="mr-1.5 inline h-4 w-4 align-[-3px]" />
              Bearbeiten
            </button>
            <button
              onClick={() => del.mutate()}
              disabled={del.isPending}
              className="flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 font-serif text-sm font-semibold tracking-[0.1em] text-[color:var(--oxblood-ink)] uppercase transition hover:bg-[color:var(--oxblood)]/20 disabled:opacity-60"
            >
              <IconTrash className="h-4 w-4" />
              Löschen
            </button>
          </div>
          <ErrorNote error={del.error} />
        </div>
      )}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="tin-sublabel">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-[color:var(--ink)]">{value}</p>
    </div>
  );
}

function PlushieForm({
  koerbchenId,
  plushie,
  onDone,
}: {
  koerbchenId: string;
  plushie?: PlushieDto;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(plushie?.name ?? '');
  const [emoji, setEmoji] = useState(plushie?.emoji ?? '');
  const [species, setSpecies] = useState(plushie?.species ?? '');
  const [character, setCharacter] = useState(plushie?.character ?? '');
  const [favorites, setFavorites] = useState(plushie?.favorites ?? '');
  const [bio, setBio] = useState(plushie?.bio ?? '');
  const [photo, setPhoto] = useState<string | null>(plushie?.photo ?? null);
  const [busy, setBusy] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const input = {
        name,
        emoji: emoji || null,
        species: species || null,
        character: character || null,
        favorites: favorites || null,
        bio: bio || null,
        photo,
      };
      return plushie
        ? api.updatePlushie(koerbchenId, plushie.id, input)
        : api.createPlushie(koerbchenId, input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.plushies(koerbchenId) });
      onDone();
    },
  });

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImgError(null);
    setBusy(true);
    try {
      setPhoto(await resizeImageToDataUrl(file));
    } catch {
      setImgError('Bild konnte nicht verarbeitet werden.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (name.trim()) save.mutate();
      }}
      className="panel space-y-3 p-5"
    >
      <p className="tin-sublabel">{plushie ? 'Steckbrief bearbeiten' : 'Neuer Steckbrief'}</p>

      <div className="flex items-center gap-3.5">
        <Avatar plushie={{ photo, emoji }} className="h-20 w-20" />
        <div className="flex flex-col gap-2">
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="btn3d-soft px-3 py-2 text-sm disabled:opacity-60"
          >
            {busy ? 'lädt …' : photo ? 'Foto ändern' : 'Foto wählen'}
          </button>
          {photo && (
            <button
              type="button"
              onClick={() => setPhoto(null)}
              className="ghost -mr-1.5 hover:text-[color:var(--oxblood-ink)]"
            >
              Foto entfernen
            </button>
          )}
        </div>
      </div>
      {imgError && <p className="text-sm text-[color:var(--oxblood-ink)]">{imgError}</p>}

      <div className="flex gap-2">
        <input
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          placeholder="🧸"
          aria-label="Emoji"
          className="field w-14 text-center"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          aria-label="Name"
          required
          className="field flex-1"
        />
      </div>
      <input
        value={species}
        onChange={(e) => setSpecies(e.target.value)}
        placeholder="Art / Spezies (z.B. Bär)"
        aria-label="Art"
        className="field w-full"
      />
      <input
        value={character}
        onChange={(e) => setCharacter(e.target.value)}
        placeholder="Charakter (z.B. schmusig, etwas frech)"
        aria-label="Charakter"
        className="field w-full"
      />
      <input
        value={favorites}
        onChange={(e) => setFavorites(e.target.value)}
        placeholder="Lieblingsessen / Hobbys"
        aria-label="Lieblingsessen und Hobbys"
        className="field w-full"
      />
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="Steckbrief (frei)"
        aria-label="Steckbrief"
        rows={3}
        className="field w-full"
      />

      <ErrorNote error={save.error} />

      <div className="flex gap-2">
        <button type="button" onClick={onDone} className="btn3d-soft flex-1 py-2.5 text-sm">
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={save.isPending || busy}
          className="btn3d flex-1 py-2.5 text-sm"
        >
          {save.isPending ? '…' : 'Speichern'}
        </button>
      </div>
    </form>
  );
}
