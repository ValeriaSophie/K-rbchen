import { useEffect, useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DiaperTypeDto } from '@koerbchen/shared';
import { api } from '../../lib/api';
import { qk } from '../../lib/queryKeys';
import { ErrorNote } from '../../lib/ErrorNote';
import { ListNote } from '../../lib/LoadState';
import { IconDiaper, IconCheck, IconPencil, IconTrash } from '../../lib/icons';

export function useDiaperTypes(id: string) {
  return useQuery({ queryKey: qk.diaper(id), queryFn: () => api.listDiaperTypes(id) });
}
export function useChange(id: string) {
  return useQuery({ queryKey: qk.change(id), queryFn: () => api.changeStatus(id) });
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

const RESTOCK_STEPS = [5, 10, 20];

// Caregiver: configure diaper types and keep each type's stock topped up.
export function DiaperCard({ koerbchenId }: { koerbchenId: string }) {
  const types = useDiaperTypes(koerbchenId);
  const [manage, setManage] = useState(false);
  const list = types.data ?? [];

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between gap-2">
        {/* One stencil, not a stencil plus a heading repeating it. The tin is
            labelled WINDELVORRAT; there is no second name for it. */}
        <h2 className="tin-label flex min-w-0 items-center gap-2.5">
          <span className="card-ic h-9 w-9 shrink-0">
            <IconDiaper className="h-5 w-5" />
          </span>
          <span className="truncate">Windelvorrat</span>
        </h2>
        <button
          onClick={() => setManage((m) => !m)}
          className="ghost -mr-1.5 shrink-0"
        >
          {manage ? (
              <>
                <IconCheck className="mr-1.5 h-3.5 w-3.5" />
                fertig
              </>
            ) : (
              <>
                <IconPencil className="mr-1.5 h-3.5 w-3.5" />
                verwalten
              </>
            )}
        </button>
      </div>

      {list.length === 0 && (
        <div className="mt-3">
          <ListNote
            isError={types.isError}
            error={types.error}
            onRetry={() => void types.refetch()}
            empty={`Noch keine Windeltypen. ${manage ? 'Lege unten welche an.' : 'Tippe auf „verwalten“.'}`}
          />
        </div>
      )}

      <ul className="compartments mt-4 border-t-[1.5px] border-[color:var(--rim-soft)]">
        {list.map((t) => (
          <DiaperTypeRow key={t.id} koerbchenId={koerbchenId} type={t} manage={manage} />
        ))}
      </ul>

      {manage && <NewTypeForm koerbchenId={koerbchenId} />}
    </section>
  );
}

// One type: emoji + name + note, a sticker stock badge, restock steps, and — in
// manage mode — edit / delete controls.
function DiaperTypeRow({
  koerbchenId,
  type,
  manage,
}: {
  koerbchenId: string;
  type: DiaperTypeDto;
  manage: boolean;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const invalidate = () => qc.invalidateQueries({ queryKey: qk.diaper(koerbchenId) });

  const restock = useMutation({
    mutationFn: (count: number) => api.restockDiaperType(koerbchenId, type.id, count),
    onSuccess: invalidate,
  });
  const del = useMutation({
    mutationFn: () => api.deleteDiaperType(koerbchenId, type.id),
    onSuccess: invalidate,
  });
  // Retiring keeps the type (and its change history) but takes it out of the
  // picker — the gentler alternative to deleting a brand you stopped buying.
  const setActive = useMutation({
    mutationFn: (active: boolean) => api.updateDiaperType(koerbchenId, type.id, { active }),
    onSuccess: invalidate,
  });

  if (editing) {
    return (
      <li>
        <EditTypeForm koerbchenId={koerbchenId} type={type} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className={`compartment ${type.active ? '' : 'opacity-60'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2.5">
          {type.emoji && (
            <span className="emoji-token h-9 w-9 shrink-0 text-lg leading-none" aria-hidden>
              {type.emoji}
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate font-serif text-lg font-bold tracking-wide text-[color:var(--ink)]">
              {type.name}
              {!type.active && (
                <span className="ml-2 align-middle text-xs font-normal text-[color:var(--muted)]">
                  stillgelegt
                </span>
              )}
            </span>
            {type.note && (
              <span
                className="block truncate text-sm text-[color:var(--muted)]"
              >
                {type.note}
              </span>
            )}
          </span>
        </span>
        <span className={`badge ${type.isLow ? 'badge-low' : ''}`}>
          {type.isLow ? `${type.count} · knapp!` : `${type.count} auf Lager`}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {RESTOCK_STEPS.map((n) => (
          <button
            key={n}
            onClick={() => restock.mutate(n)}
            disabled={restock.isPending}
            className="btn3d-soft min-h-11 flex-1 py-2 text-sm"
          >
            +{n}
          </button>
        ))}
        {manage && (
          <>
            <button
              onClick={() => setEditing(true)}
              aria-label="Windeltyp bearbeiten"
              className="rounded-lg p-2 text-[color:var(--muted)] transition hover:text-[color:var(--ink)]"
            >
              <IconPencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => del.mutate()}
              disabled={del.isPending}
              aria-label="Windeltyp löschen"
              className="rounded-lg p-2 text-[color:var(--muted)] transition hover:text-[color:var(--oxblood-ink)] disabled:opacity-60"
            >
              <IconTrash className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
      {manage && (
        <button
          onClick={() => setActive.mutate(!type.active)}
          disabled={setActive.isPending}
          className="mt-2 ghost -mr-1.5 disabled:opacity-60"
        >
          {type.active ? 'stilllegen' : 'wieder aufnehmen'}
        </button>
      )}
      <ErrorNote error={restock.error ?? del.error ?? setActive.error} />
    </li>
  );
}

function NewTypeForm({ koerbchenId }: { koerbchenId: string }) {
  const qc = useQueryClient();
  const [emoji, setEmoji] = useState('');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const create = useMutation({
    mutationFn: () =>
      api.createDiaperType(koerbchenId, { name, emoji: emoji || null, note: note || null }),
    onSuccess: () => {
      setEmoji('');
      setName('');
      setNote('');
      qc.invalidateQueries({ queryKey: qk.diaper(koerbchenId) });
    },
  });
  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (name.trim()) create.mutate();
      }}
      className="mt-4 space-y-2 border-t-[1.5px] border-dashed border-[color:var(--rim-soft)] pt-4"
    >
      <p className="tin-sublabel">Neuer Windeltyp</p>
      <div className="flex gap-2">
        <input
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          placeholder="🌙"
          aria-label="Emoji"
          className="field w-14 text-center"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (z.B. Nacht)"
          aria-label="Name"
          className="field flex-1"
        />
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Notiz (optional)"
        aria-label="Notiz"
        className="field w-full"
      />
      <button type="submit" disabled={create.isPending} className="btn3d w-full py-2.5 text-sm">
        Hinzufügen
      </button>
    </form>
  );
}

function EditTypeForm({
  koerbchenId,
  type,
  onDone,
}: {
  koerbchenId: string;
  type: DiaperTypeDto;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [emoji, setEmoji] = useState(type.emoji ?? '');
  const [name, setName] = useState(type.name);
  const [note, setNote] = useState(type.note ?? '');
  const save = useMutation({
    mutationFn: () =>
      api.updateDiaperType(koerbchenId, type.id, {
        name,
        emoji: emoji || null,
        note: note || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.diaper(koerbchenId) });
      onDone();
    },
  });
  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (name.trim()) save.mutate();
      }}
      className="space-y-2 rounded-lg bg-black/25 p-3 shadow-[inset_0_0_0_1.5px_var(--rim-soft)]"
    >
      <div className="flex gap-2">
        <input
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          placeholder="🌙"
          aria-label="Emoji"
          className="field w-14 text-center"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Name"
          className="field flex-1"
        />
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Notiz (optional)"
        aria-label="Notiz"
        className="field w-full"
      />
      <div className="flex gap-2">
        <button type="button" onClick={onDone} className="btn3d-soft min-h-11 flex-1 py-2 text-sm">
          Abbrechen
        </button>
        <button type="submit" disabled={save.isPending} className="btn3d min-h-11 flex-1 py-2 text-sm">
          Speichern
        </button>
      </div>
    </form>
  );
}

// Both roles: pick which type was used, then log the change (stock −1).
export function ChangeCard({ koerbchenId }: { koerbchenId: string }) {
  const qc = useQueryClient();
  const types = useDiaperTypes(koerbchenId);
  const change = useChange(koerbchenId);
  // Retired types stay in the caregiver's list so their stock and history
  // remain visible, but the server refuses a change against them — so they must
  // not be offered here.
  const list = (types.data ?? []).filter((t) => t.active);
  const [selected, setSelected] = useState<string | null>(null);

  // Keep a valid selection: default to the first type, clear when none remain.
  useEffect(() => {
    if (list.length === 0) {
      setSelected(null);
      return;
    }
    if (!selected || !list.some((t) => t.id === selected)) setSelected(list[0].id);
  }, [list, selected]);

  const log = useMutation({
    mutationFn: () => api.logChange(koerbchenId, selected ? { diaperTypeId: selected } : {}),
    onSuccess: (res) => {
      qc.setQueryData(qk.change(koerbchenId), res.change);
      qc.setQueryData(qk.diaper(koerbchenId), res.diaper);
    },
  });
  const c = change.data;

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="tin-label">Frisch machen</h2>
        {/* Overdue is escalation, so it is the oxblood plate — the same mark as
            "knapp!". It used to borrow the Sterne tin's gold, which put a
            second firing on the panel and made the alarm read as a reward. */}
        {c?.isDue && <span className="badge badge-low">fällig!</span>}
      </div>
      <p className="mt-3 text-[1.02rem] text-[color:var(--muted)]">
        zuletzt gewickelt:{' '}
        <b className="font-serif font-bold tracking-wide text-[color:var(--ink)] tabular-nums">
          {formatTime(c?.lastChangeAt ?? null)}
        </b>
      </p>

      {list.length > 0 ? (
        <div className="mt-5">
          <p className="tin-sublabel mb-2.5">Welcher Typ?</p>
          <div className="flex flex-wrap gap-2.5">
            {list.map((t) => {
              const active = t.id === selected;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelected(t.id)}
                  aria-pressed={active}
                  className="chip flex items-center gap-1.5 px-3.5 py-2 text-sm"
                >
                  {t.emoji ? `${t.emoji} ` : ''}
                  {t.name}
                  <span className="text-xs opacity-70">{t.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <ListNote
            isError={types.isError}
            error={types.error}
            onRetry={() => void types.refetch()}
            empty="Noch keine Windeltypen angelegt."
          />
        </div>
      )}

      <button
        onClick={() => log.mutate()}
        disabled={log.isPending || (list.length > 0 && !selected)}
        className="btn3d mt-5 flex w-full items-center justify-center gap-2.5 py-3.5 text-lg uppercase"
      >
        Frisch gewickelt
        <span className="grid h-6 w-6 place-items-center rounded-full shadow-[inset_0_0_0_1.5px_var(--rim)]">
          <IconCheck className="h-3.5 w-3.5" />
        </span>
      </button>
      <ErrorNote error={log.error} />
    </section>
  );
}
