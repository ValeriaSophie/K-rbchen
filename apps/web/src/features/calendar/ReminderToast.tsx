import { useEffect, useRef, useState } from 'react';

interface ReminderPayload {
  title?: string;
}

// Listens for the decoupled 'koerbchen:reminder' window event (dispatched by
// the live hook when a calendar.reminder arrives) and shows a transient toast.
export function ReminderToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { payload?: ReminderPayload } | undefined;
      const title = detail?.payload?.title ?? 'Termin';
      setMessage(`⏰ Erinnerung: ${title}`);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setMessage(null), 8000);
    };
    window.addEventListener('koerbchen:reminder', handler);
    return () => {
      window.removeEventListener('koerbchen:reminder', handler);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!message) return null;
  return (
    <div className="fixed inset-x-0 top-3 z-50 mx-auto w-fit rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
      {message}
    </div>
  );
}
