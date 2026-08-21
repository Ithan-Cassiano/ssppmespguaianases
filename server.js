const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const DATABASE = path.join(ROOT, 'data', 'db.json');
const WEBHOOK_URL = process.env.ADMIN_WEBHOOK_URL || '';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;
const sessions = new Map();
const loginAttempts = new Map();

// Somente estes caminhos podem ser baixados como arquivo estático. Tudo fora
// disso (data/, .git/, server.js, package.json, pages/ legado) é 404 —
// evita vazar o banco de dados e o código-fonte do servidor.
const ALLOWED_ROOT_FILES = new Set(['index.html', 'servicos.html', 'concursos.html', 'resultados.html', 'corregedoria.html', 'comunica.html', 'ascom.html', 'fale-conosco.html', 'painel-e3f6b8e4bf.html', 'style.css', 'favicon.ico']);
const ALLOWED_DIRS = ['images/', 'scripts/', 'styles/'];

// Rotas "limpas" (sem .html) que o navegador mostra na barra de endereço.
const CLEAN_ROUTES = { '': 'index.html', 'servicos': 'servicos.html', 'concursos': 'concursos.html', 'resultados': 'resultados.html', 'corregedoria': 'corregedoria.html', 'comunica': 'comunica.html', 'ascom': 'ascom.html', 'fale-conosco': 'fale-conosco.html', 'painel-e3f6b8e4bf': 'painel-e3f6b8e4bf.html' };

function isAllowedPath(relative) {
  if (ALLOWED_ROOT_FILES.has(relative)) return true;
  return ALLOWED_DIRS.some(dir => relative.startsWith(dir));
}

function securityHeaders(extra) {
  // 'unsafe-inline' em script-src é necessário porque as páginas usam onclick="" e <script> inline
  // em todo lugar — isso reduz a proteção do CSP contra XSS refletido, mas sem isso o site quebra.
  return { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src https://fonts.gstatic.com https://cdnjs.cloudflare.com; script-src 'self' 'unsafe-inline'; connect-src 'self'", ...extra };
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) { return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`; }
function verifyPassword(password, stored) { if (!stored || !stored.includes(':')) return false; const [salt, hash] = stored.split(':'); const check = crypto.scryptSync(password, salt, 64); const expected = Buffer.from(hash, 'hex'); return check.length === expected.length && crypto.timingSafeEqual(check, expected); }
function migratePlaintextPasswords(database) { let changed = false; database.users.forEach(account => { if (!account.password.includes(':')) { account.password = hashPassword(account.password); changed = true; } }); if (changed) writeDatabase(database); }
function tooManyAttempts(ip) { const entry = loginAttempts.get(ip); if (!entry) return false; if (Date.now() - entry.first > LOGIN_WINDOW_MS) { loginAttempts.delete(ip); return false; } return entry.count >= LOGIN_MAX_ATTEMPTS; }
function registerFailedAttempt(ip) { const entry = loginAttempts.get(ip); if (!entry || Date.now() - entry.first > LOGIN_WINDOW_MS) { loginAttempts.set(ip, { count: 1, first: Date.now() }); } else { entry.count += 1; } }
function clearAttempts(ip) { loginAttempts.delete(ip); }

// Encaminha uma notificação para o webhook configurado no servidor (ex.: Discord).
// Nunca fica exposto no front-end — só o processo do servidor conhece a URL.
function notifyWebhook(title, fields) {
  if (!WEBHOOK_URL) return;
  try {
    const target = new URL(WEBHOOK_URL);
    const payload = JSON.stringify({ content: `**${title}**\n` + fields.map(([label, value]) => `${label}: ${value || '—'}`).join('\n') });
    const request = https.request({ hostname: target.hostname, path: target.pathname + target.search, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } });
    request.on('error', () => {});
    request.write(payload);
    request.end();
  } catch { /* webhook mal configurado — ignora silenciosamente */ }
}
const modules = ['news', 'editais', 'resultados', 'denuncias', 'operacionais', 'servicos', 'solicitacoes', 'organograma', 'medalhas', 'unidades'];
const permissions = ['news', 'editais', 'resultados', 'denuncias', 'comunica_pf', 'porte', 'documentos', 'reabilitacao', 'fale_conosco', 'operacionais', 'servicos', 'organograma', 'medalhas', 'unidades', 'config', 'users'];
const requestKinds = ['porte', 'documentos', 'reabilitacao', 'contato'];
const requestKindPermission = { porte: 'porte', documentos: 'documentos', reabilitacao: 'reabilitacao', contato: 'fale_conosco' };

function formPermission(collection, item) {
  if (collection === 'denuncias') return item.origem === 'comunica' ? 'comunica_pf' : 'denuncias';
  if (collection === 'solicitacoes') return requestKindPermission[item.tipo] || null;
  return collection;
}

function readDatabase() { return JSON.parse(fs.readFileSync(DATABASE, 'utf8')); }
function writeDatabase(database) { fs.writeFileSync(DATABASE, JSON.stringify(database, null, 2)); }
function sendJson(response, status, payload) { response.writeHead(status, securityHeaders({ 'Content-Type': 'application/json; charset=utf-8' })); response.end(JSON.stringify(payload)); }
function parseCookies(request) { return Object.fromEntries((request.headers.cookie || '').split(';').filter(Boolean).map(cookie => { const [key, ...value] = cookie.trim().split('='); return [key, decodeURIComponent(value.join('='))]; })); }
function currentUser(request) { const token = parseCookies(request).pf_session; if (!token) return null; const session = sessions.get(token); if (!session) return null; if (Date.now() > session.expiresAt) { sessions.delete(token); return null; } return session.user; }
function readBody(request) { return new Promise((resolve, reject) => { let body = ''; let size = 0; request.on('data', chunk => { size += chunk.length; if (size > 2_000_000) { reject(new Error('Corpo da requisição excede o limite permitido.')); request.destroy(); return; } body += chunk; }); request.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('JSON inválido')); } }); request.on('error', reject); }); }
function safeUser(user) { return { id: user.id, username: user.username, name: user.name, role: user.role, permissions: user.permissions || permissions }; }
function can(user, module) { return user && (user.role === 'admin' || (user.permissions || []).includes(module)); }
function collectionName(name) { return name === 'news' ? 'news' : name; }
// "//algo" é interpretado pelo parser de URL como referência de rede (protocol-relative)
// e derruba `new URL()` com o host como base. Colapsa barras duplicadas antes de parsear.
function parseRequestUrl(request) { return new URL(request.url.replace(/^\/+/, '/'), `http://${request.headers.host}`); }
function serveStatic(request, response) {
  const parsedUrl = parseRequestUrl(request);
  const requested = decodeURIComponent(parsedUrl.pathname);
  const cleanKey = requested.replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase();

  // /pagina.html (ou /pagina.html?query) sempre redireciona pra URL limpa /pagina
  if (cleanKey.endsWith('.html')) {
    const withoutExt = cleanKey.slice(0, -5);
    const target = (withoutExt === 'index' ? '/' : '/' + withoutExt) + parsedUrl.search;
    response.writeHead(301, securityHeaders({ Location: target }));
    response.end();
    return;
  }

  let relative;
  if (Object.prototype.hasOwnProperty.call(CLEAN_ROUTES, cleanKey)) {
    relative = CLEAN_ROUTES[cleanKey];
  } else {
    relative = requested.replace(/^\/+/, '');
  }
  if (!isAllowedPath(relative)) { sendJson(response, 404, { error: 'Página não encontrada' }); return; }
  const filePath = path.resolve(ROOT, relative);
  const withinRoot = filePath === ROOT || filePath.startsWith(ROOT + path.sep);
  if (!withinRoot || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) { sendJson(response, 404, { error: 'Página não encontrada' }); return; }
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
  response.writeHead(200, securityHeaders({ 'Content-Type': `${types[path.extname(filePath).toLowerCase()] || 'application/octet-stream'}; charset=utf-8` }));
  fs.createReadStream(filePath).pipe(response);
}

async function handleApi(request, response) {
  const url = parseRequestUrl(request);
  const database = readDatabase();
  const user = currentUser(request);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const module = pathParts[1];

  if (request.method === 'GET' && url.pathname === '/api/me') { sendJson(response, 200, { user: user || null }); return; }
  if (request.method === 'GET' && modules.includes(module) && pathParts.length === 2) { sendJson(response, 200, database[collectionName(module)] || []); return; }
  if (request.method === 'GET' && url.pathname === '/api/admin/data') { if (!user) { sendJson(response, 401, { error: 'Faça login.' }); return; } const data = {}; [...modules].forEach(key => { const collection = database[key] || []; data[key] = (key === 'denuncias' || key === 'solicitacoes') ? collection.filter(item => can(user, formPermission(key, item))) : (can(user, key) ? collection : []); }); if (can(user, 'users')) data.usuarios = database.users.map(safeUser); data.config = database.config || {}; sendJson(response, 200, data); return; }
  if (request.method === 'GET' && module === 'protocolo' && pathParts.length === 3) {
    const code = decodeURIComponent(pathParts[2]).trim();
    const resultado = (database.resultados || []).find(item => String(item.token || '').toLowerCase() === code.toLowerCase());
    if (resultado) { sendJson(response, 200, { type: 'resultado', token: resultado.token, title: resultado.title, status: resultado.status || 'Publicado', date: resultado.date || '' }); return; }
    const denuncia = database.denuncias.find(entry => entry.id === code);
    if (denuncia) { sendJson(response, 200, { type: 'denuncia', id: denuncia.id, status: denuncia.status, motivoEncerramento: denuncia.motivoEncerramento || undefined, createdAt: denuncia.createdAt }); return; }
    const solicitacao = database.solicitacoes.find(entry => entry.id === code);
    if (solicitacao) { sendJson(response, 200, { type: 'solicitacao', id: solicitacao.id, tipo: solicitacao.tipo, status: solicitacao.status, motivoEncerramento: solicitacao.motivoEncerramento || undefined, createdAt: solicitacao.createdAt }); return; }
    sendJson(response, 404, { error: 'Nenhum resultado localizado para este identificador.' });
    return;
  }
  if (request.method === 'GET' && module === 'denuncias' && pathParts.length === 3) { const item = database.denuncias.find(entry => entry.id === pathParts[2]); if (!item) { sendJson(response, 404, { error: 'Protocolo não encontrado.' }); return; } sendJson(response, 200, { id: item.id, status: item.status, motivoEncerramento: item.motivoEncerramento || undefined, createdAt: item.createdAt }); return; }
  if (request.method === 'GET' && module === 'solicitacoes' && pathParts.length === 3) { const item = database.solicitacoes.find(entry => entry.id === pathParts[2]); if (!item) { sendJson(response, 404, { error: 'Protocolo não encontrado.' }); return; } sendJson(response, 200, { id: item.id, tipo: item.tipo, status: item.status, motivoEncerramento: item.motivoEncerramento || undefined, createdAt: item.createdAt }); return; }
  if (request.method === 'POST' && url.pathname === '/api/solicitacoes') { const body = await readBody(request); if (!requestKinds.includes(body.tipo) || !body.nome || !body.descricao) { sendJson(response, 400, { error: 'Tipo, nome e descrição são obrigatórios.' }); return; } const item = { id: crypto.randomUUID(), tipo: body.tipo, nome: String(body.nome).trim(), passaporte: String(body.passaporte || '').trim(), contato: String(body.contato || '').trim(), descricao: String(body.descricao).trim(), anexos: Array.isArray(body.anexos) ? body.anexos.filter(link => typeof link === 'string').map(link => link.trim()).filter(Boolean).slice(0, 5) : [], status: 'Em análise', createdAt: new Date().toISOString() }; database.solicitacoes.unshift(item); writeDatabase(database); notifyWebhook('Nova solicitação — ' + item.tipo, [['Protocolo', item.id], ['Nome', item.nome], ['Contato', item.contato], ['Descrição', item.descricao]]); sendJson(response, 201, { id: item.id, status: item.status }); return; }
  if (request.method === 'POST' && url.pathname === '/api/login') {
    const ip = request.socket.remoteAddress || 'unknown';
    if (tooManyAttempts(ip)) { sendJson(response, 429, { error: 'Muitas tentativas de login. Aguarde alguns minutos.' }); return; }
    const body = await readBody(request);
    const account = database.users.find(item => item.username === body.username);
    if (!account || !verifyPassword(String(body.password || ''), account.password)) { registerFailedAttempt(ip); sendJson(response, 401, { error: 'Usuário ou senha inválidos.' }); return; }
    clearAttempts(ip);
    const token = crypto.randomBytes(32).toString('hex');
    const loggedUser = safeUser(account);
    sessions.set(token, { user: loggedUser, expiresAt: Date.now() + SESSION_TTL_MS });
    response.writeHead(200, securityHeaders({ 'Set-Cookie': `pf_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`, 'Content-Type': 'application/json; charset=utf-8' }));
    response.end(JSON.stringify({ user: loggedUser }));
    return;
  }
  if (request.method === 'POST' && url.pathname === '/api/logout') { sessions.delete(parseCookies(request).pf_session); response.writeHead(200, securityHeaders({ 'Set-Cookie': 'pf_session=; Max-Age=0; Path=/', 'Content-Type': 'application/json' })); response.end(JSON.stringify({ ok: true })); return; }
  if (request.method === 'POST' && url.pathname === '/api/denuncias') { const body = await readBody(request); if (!body.subject || !body.description) { sendJson(response, 400, { error: 'Assunto e descrição são obrigatórios.' }); return; } const item = { id: crypto.randomUUID(), subject: String(body.subject).trim(), description: String(body.description).trim(), contact: String(body.contact || '').trim(), alvo: String(body.alvo || '').trim(), local: String(body.local || '').trim(), anonima: Boolean(body.anonima), origem: body.origem === 'comunica' ? 'comunica' : 'formal', anexos: Array.isArray(body.anexos) ? body.anexos.filter(link => typeof link === 'string').map(link => link.trim()).filter(Boolean).slice(0, 5) : [], status: 'Recebida', createdAt: new Date().toISOString() }; database.denuncias.unshift(item); writeDatabase(database); notifyWebhook(item.anonima ? 'Nova comunicação sigilosa' : 'Nova denúncia formal', [['Protocolo', item.id], ['Assunto', item.subject], ['Alvo/local', item.alvo], ['Contato', item.anonima ? 'anônimo' : item.contact], ['Descrição', item.description]]); sendJson(response, 201, { id: item.id, status: item.status }); return; }
  if (request.method === 'POST' && modules.includes(module)) { if (!can(user, module)) { sendJson(response, 403, { error: `Seu usuário não possui permissão para ${module}.` }); return; } const body = await readBody(request); const required = module === 'news' ? ['title', 'summary'] : module === 'denuncias' ? ['subject', 'description'] : ['title', 'description']; if (required.some(key => !body[key])) { sendJson(response, 400, { error: 'Preencha os campos obrigatórios.' }); return; } const item = { id: crypto.randomUUID(), ...body, createdAt: new Date().toISOString(), status: body.status || (module === 'editais' ? 'Aberto' : 'Publicado') }; database[collectionName(module)].unshift(item); writeDatabase(database); sendJson(response, 201, item); return; }
  if (request.method === 'DELETE' && modules.includes(module) && pathParts[2]) { const collection = database[collectionName(module)] || []; const existing = collection.find(entry => entry.id === pathParts[2]); if (module === 'denuncias' || module === 'solicitacoes') { if (!existing) { sendJson(response, 404, { error: 'Registro não encontrado.' }); return; } if (!can(user, formPermission(module, existing))) { sendJson(response, 403, { error: 'Sem permissão para este registro.' }); return; } } else if (!can(user, module)) { sendJson(response, 403, { error: 'Sem permissão para este módulo.' }); return; } database[collectionName(module)] = collection.filter(item => item.id !== pathParts[2]); writeDatabase(database); sendJson(response, 200, { ok: true }); return; }
  if (request.method === 'PATCH' && modules.includes(module) && pathParts[2]) { const collection = database[collectionName(module)] || []; const item = collection.find(entry => entry.id === pathParts[2]); if (!item) { sendJson(response, 404, { error: 'Registro não encontrado.' }); return; } if (module === 'denuncias' || module === 'solicitacoes') { if (!can(user, formPermission(module, item))) { sendJson(response, 403, { error: 'Sem permissão para este registro.' }); return; } } else if (!can(user, module)) { sendJson(response, 403, { error: 'Sem permissão para este módulo.' }); return; } const body = await readBody(request); if (body.status === 'Encerrado' && !String(body.motivoEncerramento || '').trim()) { sendJson(response, 400, { error: 'Informe o motivo do encerramento.' }); return; } const { id, createdAt, ...rest } = body; if (Array.isArray(rest.anexosAnalise)) rest.anexosAnalise = rest.anexosAnalise.filter(link => typeof link === 'string').map(link => link.trim()).filter(Boolean).slice(0, 5); Object.assign(item, rest, { updatedAt: new Date().toISOString() }); writeDatabase(database); sendJson(response, 200, item); return; }
  if (request.method === 'GET' && url.pathname === '/api/config') { sendJson(response, 200, database.config || {}); return; }
  if (request.method === 'PATCH' && url.pathname === '/api/config') { if (!can(user, 'config')) { sendJson(response, 403, { error: 'Sem permissão para editar configurações do site.' }); return; } const body = await readBody(request); database.config = { ...database.config, ...body }; writeDatabase(database); sendJson(response, 200, database.config); return; }
  if (request.method === 'POST' && url.pathname === '/api/users') { if (!can(user, 'users')) { sendJson(response, 403, { error: 'Apenas administradores podem gerenciar usuários.' }); return; } const body = await readBody(request); if (!body.username || !body.password) { sendJson(response, 400, { error: 'Usuário e senha são obrigatórios.' }); return; } if (database.users.some(item => item.username === body.username)) { sendJson(response, 409, { error: 'Usuário já existe.' }); return; } if (String(body.password).length < 8) { sendJson(response, 400, { error: 'A senha deve ter no mínimo 8 caracteres.' }); return; } const account = { id: crypto.randomUUID(), username: body.username.trim(), password: hashPassword(body.password), name: body.name?.trim() || body.username.trim(), role: body.role === 'admin' ? 'admin' : 'editor', permissions: (body.permissions || []).filter(item => permissions.includes(item)) }; database.users.push(account); writeDatabase(database); sendJson(response, 201, safeUser(account)); return; }
  if (request.method === 'PATCH' && url.pathname.startsWith('/api/users/')) { if (!can(user, 'users')) { sendJson(response, 403, { error: 'Apenas administradores podem alterar permissões.' }); return; } const account = database.users.find(item => item.id === pathParts[2]); if (!account) { sendJson(response, 404, { error: 'Usuário não encontrado.' }); return; } const body = await readBody(request); account.role = body.role === 'admin' ? 'admin' : 'editor'; account.permissions = (body.permissions || []).filter(item => permissions.includes(item)); writeDatabase(database); sendJson(response, 200, safeUser(account)); return; }
  sendJson(response, 404, { error: 'Endpoint não encontrado' });
}

migratePlaintextPasswords(readDatabase());

const server = http.createServer(async (request, response) => { try { if (request.url.startsWith('/api/')) await handleApi(request, response); else serveStatic(request, response); } catch (error) { console.error(error); sendJson(response, 500, { error: 'Erro interno do servidor.' }); } });
server.listen(PORT, () => console.log(`Portal PF disponível em http://localhost:${PORT}`));
