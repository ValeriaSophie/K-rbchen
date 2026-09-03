import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BagDto, BagItemDto } from '@koerbchen/shared';
import { api } from '../../lib/api';
import { qk } from '../../lib/queryKeys';
import { ErrorNote } from '../../lib/ErrorNote';
import { ListNote } from '../../lib/LoadState';
import { IconBag, IconCheck, IconTrash, IconRepeat, IconPencil } from '../../lib/icons';

export function useBags(id: string) {
  return useQuery({ queryKey: qk.bags(id), queryFn: () => api.listBags(id) });
}

// The "Taschen" tab: one packing-list card per bag, plus an add-bag control.
export function BagsPanel({ koerbchenId }: { koerbchenId: string }) {
  const bags = useBags(koerbchenId);
  const [adding, setAdding] = useState(false);
  const list = bags.data ?? [];

  return (
    <>
      {list.map((b) => (
        <BagCard key={b.id} koerbchenId={koerbchenId} bag={b} />
      ))}
      {adding ? (
        <NewBagForm koerbchenId={koerbchenId} onDone={() => setAdding(false)} />
      ) : (
        // The add control is a tin of its own, so the lit Taschen label always
        // floods into a body — including when there is not a single bag yet.
        <section className="panel p-6">
          {list.length === 0 && (
            <ListNote
              isError={bags.isError}
              error={bags.error}
              onRetry={() => void bags.refetch()}
              empty="Noch keine Taschen. Leg die erste an!"
            />
          )}
          <button
            onClick={() => setAdding(true)}
            className={`btn3d w-full py-3 text-sm ${list.length === 0 ? 'mt-4' : ''}`}
          >
            + Neue Tasche
          </button>
        </section>
      )}
    </>
  );
}

function BagCard({ koerbchenId, bag }: { koerbchenId: string; bag: BagDto }) {
  const qc = useQueryClient();
  const [manage, setManage] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const invalidate = () => qc.invalidateQueries({ queryKey: qk.bags(koerbchenId) });

  const reset = useMutation({
    mutationFn: () => api.resetBag(koerbchenId, bag.id),
    onSuccess: invalidate,
  });
  const del = useMutation({
    mutationFn: () => api.deleteBag(koerbchenId, bag.id),
    onSuccess: invalidate,
  });

  const allPacked = bag.totalCount > 0 && bag.packedCount === bag.totalCount;

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="tin-label flex min-w-0 items-center gap-3">
          {bag.emoji ? (
            <span className="emoji-token h-10 w-10 shrink-0 text-xl leading-none" aria-hidden>
              {bag.emoji}
            </span>
          ) : (
            <span className="card-ic h-10 w-10 shrink-0">
              <IconBag className="h-5 w-5" />
            </span>
          )}
          {/* The bag's own name is the tin's label. "PACKLISTE" above it said
              nothing the panel's contents did not already say. */}
          <span className="truncate">{bag.name}</span>
        </h2>
        <span className={`badge shrink-0 ${allPacked ? 'badge-done' : ''}`}>
          {allPacked ? 'fertig' : `${bag.packedCount}/${bag.totalCount} gepackt`}
        </span>
      </div>

      <ul className="compartments mt-4 border-t-[1.5px] border-[color:var(--rim-soft)]">
        {bag.items.map((it) => (
          <ItemRow
            key={it.id}
            koerbchenId={koerbchenId}
            bagId={bag.id}
            item={it}
            manage={manage}
          />
        ))}
        {bag.totalCount === 0 && (
          <li className="compartment text-sm text-[color:var(--muted)]">Noch nichts geplant.</li>
        )}
      </ul>

      {addOpen ? (
        <NewItemForm koerbchenId={koerbchenId} bagId={bag.id} onDone={() => setAddOpen(false)} />
      ) : (
        <button
          onClick={() => setAddOpen(true)}
          className="btn3d-soft mt-3 w-full py-2.5 text-sm uppercase"
        >
          + Eintrag hinzufügen
        </button>
      )}

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() => setManage((m) => !m)}
          className="ghost -mr-1.5"
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
        {bag.packedCount > 0 && (
          <button
            onClick={() => reset.mutate()}
            disabled={reset.isPending}
            className="flex items-center gap-1.5 ghost -mr-1.5 disabled:opacity-60"
          >
            alle zurücksetzen
            <IconRepeat className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {manage && (
        <div className="mt-3 border-t border-[color:var(--line)] pt-3">
          <EditBagForm koerbchenId={koerbchenId} bag={bag} />
          <button
            onClick={() => del.mutate()}
            disabled={del.isPending}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 font-serif text-sm font-semibold tracking-[0.1em] text-[color:var(--oxblood-ink)] uppercase transition hover:bg-[color:var(--oxblood)]/20 disabled:opacity-60"
          >
            <IconTrash className="h-4 w-4" />
            Tasche löschen
          </button>
        </div>
      )}
      <ErrorNote error={reset.error ?? del.error} />
    </section>
  );
}

function ItemRow({
  koerbchenId,
  bagId,
  item,
  manage,
}: {
  koerbchenId: string;
  bagId: string;
  item: BagItemDto;
  manage: boolean;
}) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: qk.bags(koerbchenId) });
  const toggle = useMutation({
    mutationFn: () => api.updateBagItem(koerbchenId, bagId, item.id, { packed: !item.packed }),
    onSuccess: invalidate,
  });
  const del = useMutation({
    mutationFn: () => api.deleteBagItem(koerbchenId, bagId, item.id),
    onSuccess: invalidate,
  });

  return (
    <li className="compartment flex items-center gap-3">
      <button
        onClick={() => toggle.mutate()}
        aria-pressed={item.packed}
        aria-label={item.packed ? 'Als nicht gepackt markieren' : 'Als gepackt markieren'}
        className="tickbox h-8 w-8 shrink-0"
      >
        <IconCheck className="h-3.5 w-3.5" />
      </button>

      <span className="min-w-0 flex-1">
        <span
          className={`font-serif font-bold tracking-wide ${
            item.packed ? 'text-[color:var(--muted)] line-through' : 'text-[color:var(--ink)]'
          }`}
        >
          {item.quantity > 1 && (
            <span className="mr-1.5 font-bold text-[color:var(--accent-ink)] tabular-nums">
              {item.quantity}×
            </span>
          )}
          {item.name}
        </span>
        {item.note && (
          <span
            className="block truncate text-sm text-[color:var(--muted)]"
          >
            {item.note}
          </span>
        )}
      </span>

      {manage && (
        <button
          onClick={() => del.mutate()}
          disabled={del.isPending}
          aria-label="Eintrag löschen"
          className="shrink-0 rounded-lg p-2 text-[color:var(--muted)] transition hover:text-[color:var(--oxblood-ink)] disabled:opacity-60"
        >
          <IconTrash className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}

function NewItemForm({
  koerbchenId,
  bagId,
  onDone,
}: {
  koerbchenId: string;
  bagId: string;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const create = useMutation({
    mutationFn: () =>
      api.addBagItem(koerbchenId, bagId, { name, quantity, note: note || null }),
    onSuccess: () => {
      setName('');
      setQuantity(1);
      setNote('');
      qc.invalidateQueries({ queryKey: qk.bags(koerbchenId) });
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
      <p className="tin-sublabel">Neuer Eintrag</p>
      <div className="flex gap-2">
        <input
          type="number"
          min={1}
          max={999}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
          aria-label="Anzahl"
          className="field w-16 text-center"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z.B. Handtuch"
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
        <button type="button" onClick={onDone} className="btn3d-soft flex-1 py-2 text-sm">
          Fertig
        </button>
        <button type="submit" disabled={create.isPending} className="btn3d flex-1 py-2 text-sm">
          Hinzufügen
        </button>
      </div>
      <ErrorNote error={create.error} />
    </form>
  );
}

function NewBagForm({ koerbchenId, onDone }: { koerbchenId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const [emoji, setEmoji] = useState('');
  const [name, setName] = useState('');
  const create = useMutation({
    mutationFn: () => api.createBag(koerbchenId, { name, emoji: emoji || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.bags(koerbchenId) });
      onDone();
    },
  });
  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (name.trim()) create.mutate();
      }}
      className="panel space-y-2 p-5"
    >
      <p className="tin-sublabel">Neue Tasche</p>
      <div className="flex gap-2">
        <input
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          placeholder="🧳"
          aria-label="Emoji"
          className="field w-14 text-center"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (z.B. Reisetasche)"
          aria-label="Name"
          className="field flex-1"
        />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onDone} className="btn3d-soft flex-1 py-2 text-sm">
          Abbrechen
        </button>
        <button type="submit" disabled={create.isPending} className="btn3d flex-1 py-2 text-sm">
          Anlegen
        </button>
      </div>
    </form>
  );
}

function EditBagForm({ koerbchenId, bag }: { koerbchenId: string; bag: BagDto }) {
  const qc = useQueryClient();
  const [emoji, setEmoji] = useState(bag.emoji ?? '');
  const [name, setName] = useState(bag.name);
  const save = useMutation({
    mutationFn: () => api.updateBag(koerbchenId, bag.id, { name, emoji: emoji || null }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.bags(koerbchenId) }),
  });
  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (name.trim()) save.mutate();
      }}
      className="flex gap-2"
    >
      <input
        value={emoji}
        onChange={(e) => setEmoji(e.target.value)}
        placeholder="🧳"
        aria-label="Emoji"
        className="field w-14 text-center"
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Taschenname"
        className="field flex-1"
      />
      <button type="submit" disabled={save.isPending} className="btn3d px-4 text-sm">
        Speichern
      </button>
    </form>
  );
}
