// The Worker: serves the app's files, the API under /api, the live connection and the `Cron`
// entrypoint called by `cron-central` (ADR-004). Everything about the group is delegated to the Group Durable Object.
import { WorkerEntrypoint } from 'cloudflare:workers';
import type { ApiError, ApiResult } from '../../src/application/api-contract';
import { IMAGE_MIMES, MAX_IMAGE_BYTES } from '../application/images';
import { SESSION_DAYS, type GoogleProfile } from '../application/members';
import { clearCookie, LOGIN_COOKIE, readCookie, SESSION_COOKIE, setCookie } from '../infrastructure/cookies';
import { randomToken, sha256 } from '../infrastructure/crypto';
import { devProfile, devSignInAllowed } from '../infrastructure/dev-sign-in';
import {
  authorizationUrl,
  decodePendingLogin,
  encodePendingLogin,
  exchangeCode,
  newPendingLogin,
  profileFromIdToken,
} from '../infrastructure/google-oauth';
import type { Env } from './env';
import { Group, SESSION_HASH_HEADER } from './group-object';

export { Group };

const SECURITY_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

const STATUS: Record<ApiError, number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  invalid: 400,
  conflict: 409,
  last_admin: 409,
  unavailable: 503,
};

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...SECURITY_HEADERS, 'Content-Type': 'application/json', ...headers } });
}

function redirect(location: string, cookies: string[] = []): Response {
  const headers = new Headers({ ...SECURITY_HEADERS, Location: location });
  for (const cookie of cookies) headers.append('Set-Cookie', cookie);
  return new Response(null, { status: 302, headers });
}

function group(env: Env) {
  return env.GROUP.get(env.GROUP.idFromName('grupo'));
}

async function sessionHash(request: Request): Promise<string | null> {
  const token = readCookie(request.headers.get('Cookie'), SESSION_COOKIE);
  return token ? sha256(token) : null;
}

/** Requests that change state or open the live connection must come from the app's own pages. */
function sameOrigin(request: Request, url: URL): boolean {
  return request.headers.get('Origin') === url.origin;
}

async function login(env: Env, url: URL): Promise<Response> {
  const pending = newPendingLogin();
  const target = await authorizationUrl(env.GOOGLE_CLIENT_ID, `${url.origin}/api/auth/callback`, pending);
  return redirect(target, [setCookie(LOGIN_COOKIE, encodePendingLogin(pending), 600)]);
}

/** Signs the profile in through the invite rules; the session cookie, or null without invite. */
async function startSession(env: Env, profile: GoogleProfile): Promise<string | null> {
  const token = randomToken();
  const bootstrap = (env.BOOTSTRAP_ADMIN_EMAILS ?? '').split(',').filter(Boolean);
  const result = await group(env).signIn(profile, await sha256(token), bootstrap);
  return result.ok ? setCookie(SESSION_COOKIE, token, SESSION_DAYS * 24 * 60 * 60) : null;
}

/** Starts a session for an e-mail without Google, through the same invite rules (ADR-007). */
async function devSignIn(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { email?: unknown; name?: unknown } | null;
  const profile = body && devProfile(body);
  if (!profile) return json({ error: 'invalid' }, 400);
  const cookie = await startSession(env, profile);
  return cookie ? json({ value: null }, 200, { 'Set-Cookie': cookie }) : json({ error: 'forbidden' }, 403);
}

async function callback(request: Request, env: Env, url: URL): Promise<Response> {
  const pending = decodePendingLogin(readCookie(request.headers.get('Cookie'), LOGIN_COOKIE));
  const code = url.searchParams.get('code');
  const failed = redirect('/?erro=login', [clearCookie(LOGIN_COOKIE)]);
  if (!pending || !code || url.searchParams.get('state') !== pending.state) return failed;

  const idToken = await exchangeCode({
    code,
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: `${url.origin}/api/auth/callback`,
    verifier: pending.verifier,
  });
  const profile = idToken ? profileFromIdToken(idToken, env.GOOGLE_CLIENT_ID, pending.nonce, new Date()) : null;
  if (!profile) return failed;
  const cookie = await startSession(env, profile);
  if (!cookie) return redirect('/?erro=sem-convite', [clearCookie(LOGIN_COOKIE)]);
  return redirect('/', [clearCookie(LOGIN_COOKIE), cookie]);
}

const IMAGE_ID = /^\/api\/images\/([A-Za-z0-9-]{1,64})$/;

/** The one API call whose body is not JSON: the raw bytes of a photo (ADR-012). */
async function uploadImage(request: Request, env: Env, hash: string): Promise<Response> {
  const mime = request.headers.get('Content-Type') ?? '';
  if (!(IMAGE_MIMES as readonly string[]).includes(mime)) return json({ error: 'invalid' }, 400);
  const declared = Number(request.headers.get('Content-Length'));
  if (!Number.isFinite(declared) || declared < 1 || declared > MAX_IMAGE_BYTES) return json({ error: 'invalid' }, 400);
  const data = new Uint8Array(await request.arrayBuffer());
  // The header can lie; the bytes actually read are checked again.
  if (data.byteLength < 1 || data.byteLength > MAX_IMAGE_BYTES) return json({ error: 'invalid' }, 400);
  const result = await group(env).saveImage(hash, {
    mime,
    width: Number(request.headers.get('X-Image-Width')),
    height: Number(request.headers.get('X-Image-Height')),
    data,
    system: request.headers.get('X-Image-System') === '1',
  });
  return result.ok ? json({ id: result.id }) : json({ error: result.error }, STATUS[result.error]);
}

async function serveImage(env: Env, hash: string, id: string): Promise<Response> {
  const image = await group(env).readImage(hash, id);
  if (image === 'unauthenticated') return json({ error: 'unauthenticated' }, 401);
  if (!image) return json({ error: 'not_found' }, 404);
  return new Response(image.data, {
    headers: {
      ...SECURITY_HEADERS,
      'Cache-Control': 'private, max-age=31536000, immutable',
      'Content-Type': image.mime,
    },
  });
}

async function api(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname;

  if (path === '/api/auth/login' && request.method === 'GET') return login(env, url);
  if (path === '/api/auth/callback' && request.method === 'GET') return callback(request, env, url);

  const hash = await sessionHash(request);

  // An <img> tag sends no Origin on a same-origin GET; the session cookie (SameSite) is the check.
  const image = IMAGE_ID.exec(path);
  if (image && request.method === 'GET') return hash ? serveImage(env, hash, image[1]) : json({ error: 'unauthenticated' }, 401);

  if (!sameOrigin(request, url)) return json({ error: 'forbidden' }, 403);

  if (path === '/api/live' && request.headers.get('Upgrade') === 'websocket') {
    if (!hash) return json({ error: 'unauthenticated' }, 401);
    const headers = new Headers({ Upgrade: 'websocket', [SESSION_HASH_HEADER]: hash });
    return group(env).fetch(new Request(url.toString(), { headers }));
  }

  if (path === '/api/images' && request.method === 'POST') return hash ? uploadImage(request, env, hash) : json({ error: 'unauthenticated' }, 401);

  if (request.method !== 'POST' || request.headers.get('Content-Type') !== 'application/json') {
    return json({ error: 'not_found' }, 404);
  }

  if (path === '/api/auth/logout') {
    if (hash) await group(env).signOut(hash);
    return json({ ok: true }, 200, { 'Set-Cookie': clearCookie(SESSION_COOKIE) });
  }

  if (path === '/api/auth/dev' && devSignInAllowed(env.DEV_SIGN_IN, url)) return devSignIn(request, env);

  const match = /^\/api\/(query|command)\/([a-zA-Z.]+)$/.exec(path);
  if (!match) return json({ error: 'not_found' }, 404);
  if (!hash) return json({ error: 'unauthenticated' }, 401);

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return json({ error: 'invalid' }, 400);
  }
  const [, kind, name] = match;
  // RPC wraps results in a Disposable, which hides the union from narrowing; restore it.
  const result = (kind === 'query' ? await group(env).query(hash, name, input) : await group(env).command(hash, name, input)) as ApiResult<unknown>;
  return result.ok ? json({ value: result.value }) : json({ error: result.error }, STATUS[result.error]);
}

/** The daily tick, shared by the Worker's own cron and the central cron's RPC call. */
export async function runCron(env: Env, _ctx: ExecutionContext): Promise<void> {
  await group(env).tick();
}

/** Called by `cron-central` through a service binding (named entrypoint `Cron`). */
export class Cron extends WorkerEntrypoint<Env> {
  async tick(): Promise<void> {
    await runCron(this.env, this.ctx);
  }
}

export default {
  async fetch(request, env, _ctx): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return api(request, env, url);
    return env.ASSETS.fetch(request);
  },

} satisfies ExportedHandler<Env>;
