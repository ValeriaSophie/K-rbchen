import { useEffect, useState } from 'react';

export function App() {
  const [status, setStatus] = useState<string>('…');

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d: { status: string }) => setStatus(d.status))
      .catch(() => setStatus('offline'));
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-pink-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-pink-700">Körbchen</h1>
        <p className="mt-2 text-sm text-pink-900/60">API: {status}</p>
      </div>
    </main>
  );
}
