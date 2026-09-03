import { ApiError } from './api';

// Turns whatever a mutation threw into a sentence worth showing. Server errors
// already carry a German message in their envelope; anything else means the
// request never got an answer.
export function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof ApiError) return error.message;
  return 'Verbindung fehlgeschlagen';
}

// Inline error line for forms and action panels. Renders nothing when there is
// no error, so it can sit unconditionally in a component's markup.
export function ErrorNote({ error, className = '' }: { error: unknown; className?: string }) {
  const message = errorMessage(error);
  if (!message) return null;
  return (
    <p role="alert" className={`mt-2 text-sm text-[color:var(--oxblood-ink)] ${className}`}>
      {message}
    </p>
  );
}
