import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { classify, policy, wellbeing, recommendation } from './src/engine.js';
import { profiles, AGE } from './src/profiles.js';

const root = process.cwd(), port = Number(process.env.PORT || 4173), host = process.env.HOST || '127.0.0.1';
const storeFile = join(root, 'data', 'safescroll.json'), clients = new Set();
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };
let store = { profiles: structuredClone(profiles), events: [] };

async function loadStore() { try { store = JSON.parse(await readFile(storeFile, 'utf8')); } catch { await persist(); } }
async function persist() { await mkdir(join(root, 'data'), { recursive: true }); await writeFile(storeFile, JSON.stringify(store, null, 2)); }
function json(res, status, data) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(data)); }
function broadcast(payload) { const line = `data: ${JSON.stringify(payload)}\n\n`; for (const client of clients) client.write(line); }
function snapshot(profileId) { const p = store.profiles[profileId]; if (!p) return null; const profileEvents = store.events.filter(e => e.profileId === profileId); const score = wellbeing({ screenMinutes: p.screen, goalMinutes: p.goal, lateMinutes: p.late, longSessions: p.long, safetyEvents: p.alerts, categories: new Set(p.cats.map(x => x[0])) }); return { profile: p, age: AGE[profileId], events: profileEvents.slice(0, 25), score, recommendation: recommendation({ screenMinutes:p.screen, goalMinutes:p.goal, lateMinutes:p.late, longSessions:p.long }) }; }
function validEvent(body) { return body && typeof body.profileId === 'string' && store.profiles[body.profileId] && typeof body.category === 'string' && body.category.length <= 64 && typeof body.platform === 'string' && body.platform.length <= 64; }
function connectorStatus() { return [
  { id:'instagram', name:'Instagram', provider:'Meta Graph API', configured:Boolean(process.env.INSTAGRAM_CLIENT_ID), capabilities:['Authorized business/creator account insights','Webhook-driven owned-account events'], limitation:'Meta APIs do not provide unrestricted access to a user’s personal feed or private messages.' },
  { id:'facebook', name:'Facebook', provider:'Meta Graph API', configured:Boolean(process.env.FACEBOOK_CLIENT_ID), capabilities:['Page insights','User-authorized Page content and webhooks'], limitation:'Only approved permissions and user-authorized Page data can be used.' },
  { id:'youtube', name:'YouTube', provider:'YouTube Data & Analytics APIs', configured:Boolean(process.env.YOUTUBE_CLIENT_ID), capabilities:['Authorized channel analytics','Playlist/activity metadata within approved scopes'], limitation:'OAuth and Google verification may be required for sensitive scopes.' },
  { id:'x', name:'X', provider:'X API v2', configured:Boolean(process.env.X_CLIENT_ID), capabilities:['User-context data within granted OAuth scopes','Webhook/poll based monitoring where product access permits'], limitation:'Access depends on the X developer plan, scopes, and endpoint availability.' }
]; }
async function body(req) { let chunks = '', size = 0; for await (const c of req) { size += c.length; if (size > 16_384) throw Error('Request body too large'); chunks += c; } return JSON.parse(chunks || '{}'); }
async function handleEvent(input) { const p = store.profiles[input.profileId], c = classify(input.caption || input.category, input.category); const prior = store.events.filter(e => e.profileId === input.profileId && e.category === c.category).length; const decision = policy({ age: AGE[input.profileId], classification: c, repetition: prior, sessionMinutes: Math.round(p.screen / (p.long + 3)) });
  p.screen += Math.max(1, Math.min(10, Number(input.durationMinutes) || 3)); p.videos += 1; if (decision.level > 0) p.alerts += 1;
  const event = { id: crypto.randomUUID(), profileId: input.profileId, category:c.category, platform:input.platform, confidence:Math.round(c.confidence*100), severity:c.severity, decision, explanation:c.explanation, createdAt:new Date().toISOString() }; store.events.unshift(event); store.events = store.events.slice(0, 500); await persist(); const update = { type:'analytics.updated', profileId:input.profileId, event, snapshot:snapshot(input.profileId) }; broadcast(update); return update;
}
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname === '/api/health') return json(res, 200, { status:'ok', service:'safescroll-api', time:new Date().toISOString() });
    if (url.pathname === '/api/profiles' && req.method === 'GET') return json(res, 200, Object.entries(store.profiles).map(([id, p]) => ({ id, label:p.label, age:AGE[id] })));
    if (url.pathname === '/api/connectors' && req.method === 'GET') return json(res, 200, connectorStatus());
    if (url.pathname === '/api/state' && req.method === 'GET') { const state = snapshot(url.searchParams.get('profile') || 'minor'); return state ? json(res, 200, state) : json(res, 404, { error:'Unknown profile' }); }
    if (url.pathname === '/api/events' && req.method === 'POST') { const input = await body(req); if (!validEvent(input)) return json(res, 422, { error:'profileId, category, and platform are required.' }); const update = await handleEvent(input); return json(res, 201, update); }
    if (url.pathname === '/api/goals' && req.method === 'PATCH') { const input = await body(req), p = store.profiles[input.profileId]; if (!p || !Number.isInteger(input.goal) || input.goal < 15 || input.goal > 1440) return json(res, 422, { error:'A valid profileId and goal (15–1440 minutes) are required.' }); p.goal = input.goal; await persist(); const update = { type:'preferences.updated', profileId:input.profileId, snapshot:snapshot(input.profileId) }; broadcast(update); return json(res, 200, update); }
    if (url.pathname === '/api/stream' && req.method === 'GET') { res.writeHead(200, { 'Content-Type':'text/event-stream', 'Cache-Control':'no-cache', Connection:'keep-alive', 'X-Accel-Buffering':'no' }); res.write(': connected\n\n'); clients.add(res); req.on('close', () => clients.delete(res)); return; }
    const name = url.pathname === '/' ? 'index.html' : normalize(url.pathname).replace(/^[/\\]+/, ''); const data = await readFile(join(root, name)); res.writeHead(200, { 'Content-Type':types[extname(name)] || 'application/octet-stream', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' }); res.end(data);
  } catch (error) { const status = error instanceof SyntaxError ? 400 : 404; json(res, status, { error: status === 400 ? 'Invalid JSON request body.' : 'Not found.' }); }
});
await loadStore();
server.listen(port, host, () => console.log(`SafeScroll API and web app running at http://${host}:${port}`));
