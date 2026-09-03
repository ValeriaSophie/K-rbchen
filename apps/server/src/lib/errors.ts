import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { env } from '../env';

// Application error carrying an HTTP status and a stable machine code.
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (message: string) => new AppError(400, 'bad_request', message);
export const unauthorized = (message = 'Nicht angemeldet') => new AppError(401, 'unauthorized', message);
export const forbidden = (message = 'Nicht erlaubt') => new AppError(403, 'forbidden', message);
export const notFound = (message = 'Nicht gefunden') => new AppError(404, 'not_found', message);
export const conflict = (message: string) => new AppError(409, 'conflict', message);

// German wording for the client errors raised by Fastify itself rather than by
// our own routes, so the UI never shows an English framework string.
const CLIENT_ERRORS: Record<number, { code: string; message: string }> = {
  413: { code: 'payload_too_large', message: 'Die Daten sind zu groß' },
  429: { code: 'rate_limited', message: 'Zu viele Versuche. Bitte kurz warten.' },
};

// Maps thrown errors to the uniform `{ error: { code, message } }` envelope.
export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({ error: { code: err.code, message: err.message } });
    }
    if (err instanceof ZodError) {
      const message = err.issues[0]?.message ?? 'Ungültige Eingabe';
      return reply.status(400).send({ error: { code: 'validation', message } });
    }
    // Fastify and its plugins report client errors through `statusCode`.
    // Without this they would all surface as "Interner Serverfehler" — a hit
    // rate limit would look like a broken server.
    const { statusCode, message } = err as { statusCode?: number; message?: string };
    if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
      const known = CLIENT_ERRORS[statusCode];
      return reply.status(statusCode).send({
        error: {
          code: known?.code ?? 'bad_request',
          message: known?.message ?? message ?? 'Ungültige Anfrage',
        },
      });
    }
    // The Fastify logger is only enabled in production (see buildApp), so an
    // unexpected error would otherwise vanish without a trace while developing.
    if (env.isProd) app.log.error(err);
    else console.error(err);
    return reply.status(500).send({ error: { code: 'internal', message: 'Interner Serverfehler' } });
  });
}
