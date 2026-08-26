import type { FastifyInstance, InjectOptions } from 'fastify';

export interface InjectResult {
  cookies: Array<{ name: string; value: string }>;
}

// Extracts the session cookie header value from an inject response.
export function cookieHeader(res: InjectResult): string {
  const sid = res.cookies.find((c) => c.name === 'sid');
  return sid ? `sid=${sid.value}` : '';
}

// Registers a user and returns their session cookie header.
export async function registerUser(
  app: FastifyInstance,
  email: string,
  displayName: string,
  password = 'passwort123',
): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password, displayName },
  });
  return cookieHeader(res);
}

// Convenience for an authenticated JSON request.
export function authed(cookie: string, options: InjectOptions): InjectOptions {
  return { ...options, headers: { ...(options.headers ?? {}), cookie } };
}

// Creates a caregiver + pupp sharing one Körbchen. Returns cookies and ids.
export async function setupPair(app: FastifyInstance) {
  const cgCookie = await registerUser(app, 'cg@b.de', 'Mama');
  const create = await app.inject(
    authed(cgCookie, {
      method: 'POST',
      url: '/api/koerbchen',
      payload: { name: 'Nest', role: 'caregiver' },
    }),
  );
  const k = create.json();
  const pCookie = await registerUser(app, 'pupp@b.de', 'Pupp');
  const join = await app.inject(
    authed(pCookie, {
      method: 'POST',
      url: '/api/koerbchen/join',
      payload: { inviteCode: k.inviteCode, role: 'pupp' },
    }),
  );
  const puppId = join.json().members.find((m: { role: string }) => m.role === 'pupp')
    .userId as string;
  return { koerbchenId: k.id as string, cgCookie, pCookie, puppId };
}
