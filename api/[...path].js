const crypto = require('crypto');
const db = require('../lib/db');
const { createSessionCookie, verifySessionToken, SESSION_TTL_MS } = require('../lib/auth');
const { hashPassword, verifyPassword } = require('../lib/password');

const WEBHOOK_URL = process.env.ADMIN_WEBHOOK_URL || '';
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;

const modules = ['news', 'editais', 'resultados', 'denuncias', 'operacionais', 'servicos', 'solicitacoes', 'organograma', 'medalhas', 'unidades'];
const permissions = ['news', 'editais', 'resultados', 'denuncias', 'operacionais', 'servicos', 'solicitacoes', 'organograma', 'medalhas', 'unidades', 'config', 'users'];
const requestKinds = ['porte', 'documentos', 'reabilitacao', 'contato'];

function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src https://fonts.gstatic.com https://cdnjs.cloudflare.com; script-src 'self' 'unsafe-inline'; connect-src 'self'",
  };
}

function sendJson(res, status, payload, extraHeaders) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...securityHeaders(), ...extraHeaders });
  res.end(JSON.stringify(payload));
}

function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(cookie => {
    const [key, ...value] = cookie.trim().split('=');
    return [key, decodeURIComponent(value.join('='))];
  }));
}

function currentUser(req) {
  const token = parseCookies(req).pf_session;
  return token ? verifySessionToken(token) : null;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''; let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > 2_000_000) { reject(new Error('Corpo da requisição excede o limite permitido.')); req.destroy(); return; }
      body += chunk;
    });
    req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('JSON inválido')); } });
    req.on('error', reject);
  });
}

function safeUser(user) { return { id: user.id, username: user.username, name: user.name, role: user.role, permissions: user.permissions || permissions }; }
function can(user, module) { return user && (user.role === 'admin' || (user.permissions || []).includes(module)); }
function clientIp(req) { return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown'; }

async function tooManyAttempts(ip) {
  const entry = await db.loginAttemptGet(ip);
  if (!entry) return false;
  if (Date.now() - new Date(entry.first_attempt).getTime() > LOGIN_WINDOW_MS) { await db.loginAttemptClear(ip); return false; }
  return entry.count >= LOGIN_MAX_ATTEMPTS;
}
async function registerFailedAttempt(ip) {
  const entry = await db.loginAttemptGet(ip);
  if (!entry || Date.now() - new Date(entry.first_attempt).getTime() > LOGIN_WINDOW_MS) { await db.loginAttemptSet(ip, 1, new Date().toISOString()); }
  else { await db.loginAttemptSet(ip, entry.count + 1, entry.first_attempt); }
}

function notifyWebhook(title, fields) {
  if (!WEBHOOK_URL) return;
  const content = `**${title}**\n` + fields.map(([label, value]) => `${label}: ${value || '—'}`).join('\n');
  fetch(WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) }).catch(() => {});
}

module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const user = currentUser(req);
    const pathParts = url.pathname.split('/').filter(Boolean); // ['api', ...]
    const mod = pathParts[1];

    if (req.method === 'GET' && url.pathname === '/api/me') { sendJson(res, 200, { user: user || null }); return; }

    if (req.method === 'GET' && modules.includes(mod) && pathParts.length === 2) { sendJson(res, 200, await db.getCollection(mod)); return; }

    if (req.method === 'GET' && url.pathname === '/api/admin/data') {
      if (!user) { sendJson(res, 401, { error: 'Faça login.' }); return; }
      const data = {};
      for (const key of modules) data[key] = await db.getCollection(key);
      data.usuarios = (await db.listUsers()).map(safeUser);
      data.config = await db.getConfig();
      sendJson(res, 200, data);
      return;
    }

    if (req.method === 'GET' && mod === 'denuncias' && pathParts.length === 3) {
      const item = await db.getItem('denuncias', pathParts[2]);
      if (!item) { sendJson(res, 404, { error: 'Protocolo não encontrado.' }); return; }
      sendJson(res, 200, { id: item.id, status: item.status, createdAt: item.createdAt });
      return;
    }
    if (req.method === 'GET' && mod === 'solicitacoes' && pathParts.length === 3) {
      const item = await db.getItem('solicitacoes', pathParts[2]);
      if (!item) { sendJson(res, 404, { error: 'Protocolo não encontrado.' }); return; }
      sendJson(res, 200, { id: item.id, tipo: item.tipo, status: item.status, createdAt: item.createdAt });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/solicitacoes') {
      const body = await readBody(req);
      if (!requestKinds.includes(body.tipo) || !body.nome || !body.descricao) { sendJson(res, 400, { error: 'Tipo, nome e descrição são obrigatórios.' }); return; }
      const item = {
        id: crypto.randomUUID(), tipo: body.tipo, nome: String(body.nome).trim(), passaporte: String(body.passaporte || '').trim(),
        contato: String(body.contato || '').trim(), descricao: String(body.descricao).trim(),
        anexos: Array.isArray(body.anexos) ? body.anexos.filter(link => typeof link === 'string').map(link => link.trim()).filter(Boolean).slice(0, 5) : [],
        status: 'Em análise', createdAt: new Date().toISOString(),
      };
      await db.insertItem('solicitacoes', item);
      notifyWebhook('Nova solicitação — ' + item.tipo, [['Protocolo', item.id], ['Nome', item.nome], ['Contato', item.contato], ['Descrição', item.descricao]]);
      sendJson(res, 201, { id: item.id, status: item.status });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/login') {
      const ip = clientIp(req);
      if (await tooManyAttempts(ip)) { sendJson(res, 429, { error: 'Muitas tentativas de login. Aguarde alguns minutos.' }); return; }
      const body = await readBody(req);
      const account = await db.findUserByUsername(body.username || '');
      if (!account || !verifyPassword(String(body.password || ''), account.password)) { await registerFailedAttempt(ip); sendJson(res, 401, { error: 'Usuário ou senha inválidos.' }); return; }
      await db.loginAttemptClear(ip);
      const loggedUser = safeUser(account);
      const token = createSessionCookie(loggedUser);
      sendJson(res, 200, { user: loggedUser }, { 'Set-Cookie': `pf_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_MS / 1000}; Secure` });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/logout') {
      sendJson(res, 200, { ok: true }, { 'Set-Cookie': 'pf_session=; Max-Age=0; Path=/' });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/denuncias') {
      const body = await readBody(req);
      if (!body.subject || !body.description) { sendJson(res, 400, { error: 'Assunto e descrição são obrigatórios.' }); return; }
      const item = {
        id: crypto.randomUUID(), subject: String(body.subject).trim(), description: String(body.description).trim(),
        contact: String(body.contact || '').trim(), alvo: String(body.alvo || '').trim(), local: String(body.local || '').trim(),
        anonima: Boolean(body.anonima),
        anexos: Array.isArray(body.anexos) ? body.anexos.filter(link => typeof link === 'string').map(link => link.trim()).filter(Boolean).slice(0, 5) : [],
        status: 'Recebida', createdAt: new Date().toISOString(),
      };
      await db.insertItem('denuncias', item);
      notifyWebhook(item.anonima ? 'Nova comunicação sigilosa' : 'Nova denúncia formal', [['Protocolo', item.id], ['Assunto', item.subject], ['Alvo/local', item.alvo], ['Contato', item.anonima ? 'anônimo' : item.contact], ['Descrição', item.description]]);
      sendJson(res, 201, { id: item.id, status: item.status });
      return;
    }

    if (req.method === 'POST' && modules.includes(mod)) {
      if (!can(user, mod)) { sendJson(res, 403, { error: `Seu usuário não possui permissão para ${mod}.` }); return; }
      const body = await readBody(req);
      const required = mod === 'news' ? ['title', 'summary'] : mod === 'denuncias' ? ['subject', 'description'] : ['title', 'description'];
      if (required.some(key => !body[key])) { sendJson(res, 400, { error: 'Preencha os campos obrigatórios.' }); return; }
      const item = { id: crypto.randomUUID(), ...body, createdAt: new Date().toISOString(), status: body.status || (mod === 'editais' ? 'Aberto' : 'Publicado') };
      await db.insertItem(mod, item);
      sendJson(res, 201, item);
      return;
    }

    if (req.method === 'DELETE' && modules.includes(mod) && pathParts[2]) {
      if (!can(user, mod)) { sendJson(res, 403, { error: 'Sem permissão para este módulo.' }); return; }
      await db.deleteItem(mod, pathParts[2]);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'PATCH' && modules.includes(mod) && pathParts[2]) {
      if (!can(user, mod)) { sendJson(res, 403, { error: 'Sem permissão para este módulo.' }); return; }
      const body = await readBody(req);
      const { id, createdAt, ...rest } = body;
      const updated = await db.updateItem(mod, pathParts[2], rest);
      if (!updated) { sendJson(res, 404, { error: 'Registro não encontrado.' }); return; }
      sendJson(res, 200, updated);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/config') { sendJson(res, 200, await db.getConfig()); return; }
    if (req.method === 'PATCH' && url.pathname === '/api/config') {
      if (!can(user, 'config')) { sendJson(res, 403, { error: 'Sem permissão para editar configurações do site.' }); return; }
      const body = await readBody(req);
      sendJson(res, 200, await db.patchConfig(body));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/users') {
      if (!can(user, 'users')) { sendJson(res, 403, { error: 'Apenas administradores podem gerenciar usuários.' }); return; }
      const body = await readBody(req);
      if (!body.username || !body.password) { sendJson(res, 400, { error: 'Usuário e senha são obrigatórios.' }); return; }
      if (String(body.password).length < 8) { sendJson(res, 400, { error: 'A senha deve ter no mínimo 8 caracteres.' }); return; }
      if (await db.findUserByUsername(body.username)) { sendJson(res, 409, { error: 'Usuário já existe.' }); return; }
      const account = {
        id: crypto.randomUUID(), username: body.username.trim(), password: hashPassword(body.password),
        name: body.name?.trim() || body.username.trim(), role: body.role === 'admin' ? 'admin' : 'editor',
        permissions: (body.permissions || []).filter(item => permissions.includes(item)),
      };
      await db.insertUser(account);
      sendJson(res, 201, safeUser(account));
      return;
    }
    if (req.method === 'PATCH' && url.pathname.startsWith('/api/users/')) {
      if (!can(user, 'users')) { sendJson(res, 403, { error: 'Apenas administradores podem alterar permissões.' }); return; }
      const body = await readBody(req);
      const updated = await db.updateUser(pathParts[2], { role: body.role === 'admin' ? 'admin' : 'editor', permissions: (body.permissions || []).filter(item => permissions.includes(item)) });
      if (!updated) { sendJson(res, 404, { error: 'Usuário não encontrado.' }); return; }
      sendJson(res, 200, safeUser(updated));
      return;
    }

    sendJson(res, 404, { error: 'Endpoint não encontrado' });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: 'Erro interno do servidor.' });
  }
};
