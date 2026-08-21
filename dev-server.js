// Servidor local só pra testar antes de mandar pro Vercel — usa a mesma função
// serverless de api/[...path].js e serve os arquivos estáticos com as mesmas
// regras de URL limpa que o vercel.json aplica em produção.
// Rodar: node --env-file=.env dev-server.js   (precisa de DATABASE_URL e SESSION_SECRET no .env)
const http = require('http');
const fs = require('fs');
const path = require('path');

const apiHandler = require('./api/[...path].js');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
// Sem lista fixa de rota->arquivo: qualquer <nome>.html na raiz vira /<nome>
// automaticamente, igual o cleanUrls do Vercel. Renomear um arquivo (ex.: o
// painel admin) já muda a URL sozinho, sem precisar editar isso aqui.
const ROOT_HTML_FILES = fs.readdirSync(__dirname).filter(name => name.endsWith('.html'));
const ALLOWED_ROOT_FILES = new Set([...ROOT_HTML_FILES, 'style.css', 'favicon.ico']);
const ALLOWED_DIRS = ['images/', 'scripts/', 'styles/'];
const STEM_TO_FILE = Object.fromEntries(ROOT_HTML_FILES.map(name => [name.slice(0, -5).toLowerCase(), name]));

function isAllowedPath(relative) {
  if (ALLOWED_ROOT_FILES.has(relative)) return true;
  return ALLOWED_DIRS.some(dir => relative.startsWith(dir));
}

function serveStatic(req, res) {
  const parsedUrl = new URL(req.url.replace(/^\/+/, '/'), `http://${req.headers.host}`);
  const requested = decodeURIComponent(parsedUrl.pathname);
  const cleanKey = requested.replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase();

  if (cleanKey.endsWith('.html')) {
    const withoutExt = cleanKey.slice(0, -5);
    const target = (withoutExt === 'index' ? '/' : '/' + withoutExt) + parsedUrl.search;
    res.writeHead(301, { Location: target });
    res.end();
    return;
  }

  const stemKey = cleanKey === '' ? 'index' : cleanKey;
  const relative = STEM_TO_FILE[stemKey] || requested.replace(/^\/+/, '');
  if (!isAllowedPath(relative)) { res.writeHead(404); res.end('Não encontrado'); return; }
  const filePath = path.resolve(ROOT, relative);
  const withinRoot = filePath === ROOT || filePath.startsWith(ROOT + path.sep);
  if (!withinRoot || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) { res.writeHead(404); res.end('Não encontrado'); return; }
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
  res.writeHead(200, { 'Content-Type': `${types[path.extname(filePath).toLowerCase()] || 'application/octet-stream'}; charset=utf-8` });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/api/')) await apiHandler(req, res);
  else serveStatic(req, res);
});

server.listen(PORT, () => console.log(`Dev server (Neon) em http://localhost:${PORT}`));
