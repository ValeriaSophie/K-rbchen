import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Role } from '@koerbchen/shared';
import { api } from '../../lib/api';
import { qk } from '../../lib/queryKeys';
import { ErrorNote } from '../../lib/ErrorNote';
import { ListNote } from '../../lib/LoadState';
import { IconBell, IconCheck, IconTrash, IconPencil } from '../../lib/icons';

export function usePresets(id: string) {
  return useQuery({ queryKey: qk.presets(id), queryFn: () => api.listPresets(id) });
}
export function useQuickCalls(id: string) {
  return useQuery({ queryKey: qk.quickcalls(id), queryFn: () => api.listQuickCalls(id) });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export function QuickCallPanel({
  koerbchenId,
  role,
  currentUserId,
}: {
  koerbchenId: string;
  role: Role;
  currentUserId: string;
}) {
  const qc = useQueryClient();
  const presets = usePresets(koerbchenId);
  const calls = useQuickCalls(koerbchenId);
  const [text, setText] = useState('');
  const [manage, setManage] = useState(false);

  const send = useMutation({
    mutationFn: (input: { presetId?: string; text?: string }) =>
      api.sendQuickCall(koerbchenId, input),
    onSuccess: () => {
      setText('');
      qc.invalidateQueries({ queryKey: qk.quickcalls(koerbchenId) });
    },
  });
  const ack = useMutation({
    mutationFn: (callId: string) => api.ackQuickCall(koerbchenId, callId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.quickcalls(koerbchenId) }),
  });

  const onSendText = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim()) send.mutate({ text: text.trim() });
  };

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="tin-label flex min-w-0 items-center gap-2.5">
          <span className="card-ic h-9 w-9 shrink-0">
            <IconBell className="h-5 w-5" />
          </span>
          Kurzruf
        </h2>
        {role === 'caregiver' && (
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
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(presets.data ?? []).map((p) => (
          <span key={p.id} className="flex items-center">
            <button
              onClick={() => send.mutate({ presetId: p.id })}
              disabled={send.isPending}
              className="btn3d-soft px-3.5 py-2 text-sm"
            >
              {p.emoji ? `${p.emoji} ` : ''}
              {p.label}
            </button>
            {manage && <DeletePreset koerbchenId={koerbchenId} presetId={p.id} />}
          </span>
        ))}
        {(presets.data?.length === 0 || presets.isError) && !manage && (
          <ListNote
            isError={presets.isError}
            error={presets.error}
            onRetry={() => void presets.refetch()}
            empty="Noch keine Presets."
          />
        )}
      </div>

      {manage && <PresetForm koerbchenId={koerbchenId} />}

      <form onSubmit={onSendText} className="mt-2 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="eigene Nachricht"
          maxLength={200}
          className="field flex-1"
        />
        <button type="submit" disabled={send.isPending} className="btn3d px-5 text-sm">
          Senden
        </button>
      </form>
      <ErrorNote error={send.error ?? ack.error} />

      <ul className="compartments mt-5 border-t-[1.5px] border-[color:var(--rim-soft)]">
        {(calls.data ?? []).slice(0, 8).map((c) => {
          const mine = c.fromUserId === currentUserId;
          return (
            <li
              key={c.id}
              className={`compartment flex items-start justify-between gap-3 text-sm ${
                c.acknowledgedAt ? 'text-[color:var(--muted)]' : 'text-[color:var(--ink)]'
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="font-serif font-bold tracking-wide break-words">
                  {c.emoji ? `${c.emoji} ` : ''}
                  {c.text}
                </span>
                {/* Who and when is metadata about the message, not part of it.
                    Its own line, so a long Ruf never wraps around it. */}
                <span className="mt-0.5 block text-xs text-[color:var(--muted)]">
                  {c.fromDisplayName} · {formatTime(c.createdAt)}
                </span>
              </span>
              {!c.acknowledgedAt && !mine && (
                <button onClick={() => ack.mutate(c.id)} aria-label="Gesehen" className="ack h-11 w-11 shrink-0">
                  <IconCheck className="h-4 w-4" />
                </button>
              )}
              {c.acknowledgedAt && (
                <span className="badge badge-done shrink-0 self-center">gesehen</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function DeletePreset({ koerbchenId, presetId }: { koerbchenId: string; presetId: string }) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: () => api.deletePreset(koerbchenId, presetId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.presets(koerbchenId) }),
  });
  return (
    <button
      onClick={() => del.mutate()}
      className="ml-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[color:var(--muted)] transition hover:text-[color:var(--oxblood-ink)]"
      aria-label="Preset entfernen"
    >
      <IconTrash className="h-4 w-4" />
    </button>
  );
}

function PresetForm({ koerbchenId }: { koerbchenId: string }) {
  const qc = useQueryClient();
  const [label, setLabel] = useState('');
  const [message, setMessage] = useState('');
  const [emoji, setEmoji] = useState('');
  const create = useMutation({
    mutationFn: () =>
      api.createPreset(koerbchenId, { label, message, emoji: emoji || null }),
    onSuccess: () => {
      setLabel('');
      setMessage('');
      setEmoji('');
      qc.invalidateQueries({ queryKey: qk.presets(koerbchenId) });
    },
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (label.trim() && message.trim()) create.mutate();
      }}
      className="mt-3 flex gap-2"
    >
      <input
        value={emoji}
        onChange={(e) => setEmoji(e.target.value)}
        placeholder="🙂"
        className="field w-14 text-center"
      />
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label"
        className="field w-24"
      />
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Nachricht"
        className="field flex-1"
      />
      <button type="submit" disabled={create.isPending} className="btn3d px-4 text-lg">
        +
      </button>
    </form>
  );
}
