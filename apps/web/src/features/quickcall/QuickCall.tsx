import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Role } from '@koerbchen/shared';
import { api } from '../../lib/api';
import { qk } from '../../lib/queryKeys';

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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-rose-800">Kurzruf 📣</h2>
        {role === 'caregiver' && (
          <button
            onClick={() => setManage((m) => !m)}
            className="text-xs text-rose-400 hover:text-rose-600"
          >
            {manage ? 'fertig' : 'Presets'}
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {(presets.data ?? []).map((p) => (
          <span key={p.id} className="flex items-center">
            <button
              onClick={() => send.mutate({ presetId: p.id })}
              disabled={send.isPending}
              className="rounded-full bg-rose-100 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-200 disabled:opacity-60"
            >
              {p.emoji ? `${p.emoji} ` : ''}
              {p.label}
            </button>
            {manage && <DeletePreset koerbchenId={koerbchenId} presetId={p.id} />}
          </span>
        ))}
        {presets.data?.length === 0 && !manage && (
          <span className="text-sm text-rose-900/40">Noch keine Presets.</span>
        )}
      </div>

      {manage && <PresetForm koerbchenId={koerbchenId} />}

      <form onSubmit={onSendText} className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="eigene Nachricht"
          className="field flex-1"
        />
        <button
          type="submit"
          disabled={send.isPending}
          className="rounded-2xl bg-rose-500 px-4 text-sm font-semibold text-[#0a0713] hover:bg-rose-600 disabled:opacity-60"
        >
          Senden
        </button>
      </form>

      <ul className="mt-4 space-y-2">
        {(calls.data ?? []).slice(0, 8).map((c) => {
          const mine = c.fromUserId === currentUserId;
          return (
            <li
              key={c.id}
              className={`flex items-center justify-between rounded-2xl px-4 py-2.5 text-sm ${
                c.acknowledgedAt ? 'bg-rose-50/60 text-rose-900/50' : 'bg-rose-50 text-rose-800'
              }`}
            >
              <span>
                {c.emoji ? `${c.emoji} ` : ''}
                <span className="font-medium">{c.text}</span>
                <span className="ml-2 text-xs text-rose-900/40">
                  {c.fromDisplayName} · {formatTime(c.createdAt)}
                </span>
              </span>
              {!c.acknowledgedAt && !mine && (
                <button
                  onClick={() => ack.mutate(c.id)}
                  className="rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-[#0a0713] hover:bg-rose-600"
                >
                  ✓
                </button>
              )}
              {c.acknowledgedAt && <span className="text-xs">gesehen</span>}
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
      className="ml-1 text-rose-300 hover:text-rose-600"
      aria-label="Preset entfernen"
    >
      ×
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
      <button
        type="submit"
        disabled={create.isPending}
        className="rounded-xl bg-rose-500 px-3 text-sm font-semibold text-[#0a0713] hover:bg-rose-600 disabled:opacity-60"
      >
        +
      </button>
    </form>
  );
}
