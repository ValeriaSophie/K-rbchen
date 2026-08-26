import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

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
    app.log.error(err);
    return reply.status(500).send({ error: { code: 'internal', message: 'Interner Serverfehler' } });
  });
}
