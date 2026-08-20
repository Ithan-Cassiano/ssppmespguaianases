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
const ALLOWED_ROOT_FILES = new Set(['index.html', 'servicos.html', 'concursos.html', 'resultados.html', 'corregedoria.html', 'comunica.html', 'ascom.html', 'fale-conosco.html', 'admin.html', 'style.css', 'favicon.ico']);
const ALLOWED_DIRS = ['images/', 'scripts/', 'styles/'];
const CLEAN_ROUTES = { '': 'index.html', servicos: 'servicos.html', concursos: 'concursos.html', resultados: 'resultados.html', corregedoria: 'corregedoria.html', comunica: 'comunica.html', ascom: 'ascom.html', 'fale-conosco': 'fale-conosco.html', admin: 'admin.html' };

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

  const relative = Object.prototype.hasOwnProperty.call(CLEAN_ROUTES, cleanKey) ? CLEAN_ROUTES[cleanKey] : requested.replace(/^\/+/, '');
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
