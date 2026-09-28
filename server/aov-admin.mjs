import { cookie, hash, now, random } from './auth.mjs';
import { readAov, writeAov, MAX } from './aov.mjs';
import fallback from '../data/aov-htw0702aov.json' with { type: 'json' };

const NAME = '__Host-aov-admin';
const OWNER = 'htw0702';
const TTL = 3600;
const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
const sameOrigin = req => req.headers.get('Origin') === new URL(req.url).origin;
const cookieHeader = (value, age) => `${NAME}=${value}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${age}`;

function hexBytes(value, length) {
  if (typeof value !== 'string' || value.length !== length * 2 || !/^[0-9a-f]+$/i.test(value)) return null;
  return Uint8Array.from(value.match(/../g), part => parseInt(part, 16));
}

export async function verifyPassword(password, encoded) {
  const parts = String(encoded || '').split('$');
  const salt = hexBytes(parts[2], 16), expected = hexBytes(parts[3], 32);
  const valid = parts.length === 4 && parts[0] === 'pbkdf2-sha256' && parts[1] === '100000' && salt && expected;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(password)), 'PBKDF2', false, ['deriveBits']);
  const result = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: valid ? salt : new Uint8Array(16), iterations: 100000, hash: 'SHA-256' }, key, 256));
  let diff = 0;
  const comparison = valid ? expected : result;
  for (let i = 0; i < 32; i++) diff |= result[i] ^ comparison[i];
  return Boolean(valid && diff === 0);
}

async function active(req, env) {
  if (!env.DB) return null;
  const token = cookie(req, NAME);
  if (!token) return null;
  return env.DB.prepare('SELECT csrf,expires FROM sessions WHERE token_hash=? AND subject=? AND expires>?').bind(await hash(token), `aov:${OWNER}`, now()).first();
}

export async function aovAdmin(req, env) {
  const path = new URL(req.url).pathname.slice('/api/aov-admin/'.length);
  if (!env.DB || !env.AOV_ADMIN_PASSWORD_HASH) return json({ error: 'not_configured' }, 503);
  if (path === 'login' && req.method === 'POST') {
    if (!sameOrigin(req) || !req.headers.get('Content-Type')?.startsWith('application/json')) return json({ error: 'forbidden' }, 403);
    const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
    const id = await hash(ip);
    const limit = await env.DB.prepare('SELECT attempts,until FROM aov_login_limits WHERE id=?').bind(id).first();
    if (limit?.attempts >= 5 && limit.until > now()) return json({ error: 'rate_limited' }, 429);
    let input;
    try {
      const body = await req.text();
      if (body.length > 1024) return json({ error: 'invalid_input' }, 400);
      input = JSON.parse(body);
    } catch { return json({ error: 'invalid_input' }, 400); }
    const accepted = input?.username === OWNER && typeof input?.password === 'string' && input.password.length <= 200 && await verifyPassword(input.password, env.AOV_ADMIN_PASSWORD_HASH);
    if (!accepted) {
      await env.DB.prepare('INSERT INTO aov_login_limits(id,attempts,until) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET attempts=CASE WHEN until<? THEN 1 ELSE attempts+1 END,until=?').bind(id,now()+900,now(),now()+900).run();
      return json({ error: 'invalid_login' }, 401);
    }
    await env.DB.prepare('DELETE FROM aov_login_limits WHERE id=?').bind(id).run();
    const token = random(), csrf = random();
    await env.DB.prepare('INSERT INTO sessions(token_hash,subject,csrf,expires) VALUES(?,?,?,?)').bind(await hash(token),`aov:${OWNER}`,csrf,now()+TTL).run();
    return json({ ok: true, csrf }, 200, { 'Set-Cookie': cookieHeader(token, TTL) });
  }
  const user = await active(req, env);
  if (!user) return json({ error: 'unauthorized' }, 401);
  if (path === 'session' && req.method === 'GET') return json({ ok: true, csrf: user.csrf });
  if (!sameOrigin(req) || req.headers.get('X-CSRF-Token') !== user.csrf) return json({ error: 'forbidden' }, 403);
  if (path === 'logout' && req.method === 'POST') {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await hash(cookie(req, NAME))).run();
    return json({ ok: true }, 200, { 'Set-Cookie': cookieHeader('', 0) });
  }
  if (path === 'save' && req.method === 'PUT') {
    if (!req.headers.get('Content-Type')?.startsWith('application/json')) return json({ error: 'invalid_input' }, 400);
    const body = await req.text();
    if (body.length > MAX) return json({ error: 'too_large' }, 413);
    let input;
    try { input = JSON.parse(body); } catch { return json({ error: 'invalid_json' }, 400); }
    if (!input || input.handle !== 'htw0702aov' || !Array.isArray(input.matches)) return json({ error: 'invalid_player' }, 400);
    return json(await writeAov(env, input, fallback));
  }
  return json({ error: 'not_found' }, 404);
}
