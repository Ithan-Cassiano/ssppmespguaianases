const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const request = (url, options = {}) => fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options }).then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Operação não realizada.'); return body; });

// CONTROLE DE MODAIS (se o modal não existir na página atual, leva pra home com âncora)
function abrirModalOp() { const el = document.getElementById('modalOp'); if (!el) { location.href = '/#unidades'; return; } el.style.display = 'block'; document.body.style.overflow = 'hidden'; carregarUnidades(); }
function fecharModalOp() { document.getElementById('modalOp').style.display = 'none'; document.body.style.overflow = 'auto'; }
function abrirModalOrg() { const el = document.getElementById('modalOrganograma'); if (!el) { location.href = '/#organograma'; return; } el.style.display = 'block'; document.body.style.overflow = 'hidden'; carregarOrganograma(); }
function fecharOrganograma() { document.getElementById('modalOrganograma').style.display = 'none'; document.body.style.overflow = 'auto'; }
function abrirModalMedalhas() { const el = document.getElementById('modalMedalhas'); if (!el) { location.href = '/#medalhas'; return; } el.style.display = 'block'; document.body.style.overflow = 'hidden'; carregarMedalhas(); }
function fecharModalMedalhas() { document.getElementById('modalMedalhas').style.display = 'none'; document.body.style.overflow = 'auto'; }
function abrirModalSuper() { const el = document.getElementById('modalSuper'); if (!el) { location.href = '/#sede'; return; } el.style.display = 'block'; document.body.style.overflow = 'hidden'; }
function fecharModalSuper() { document.getElementById('modalSuper').style.display = 'none'; document.body.style.overflow = 'auto'; }
window.onclick = event => { if (event.target.classList && (event.target.classList.contains('modal-org') || event.target.classList.contains('modal-operacionais'))) { event.target.style.display = 'none'; document.body.style.overflow = 'auto'; } };

const anchorAbrir = { organograma: abrirModalOrg, medalhas: abrirModalMedalhas, unidades: abrirModalOp, sede: abrirModalSuper };
if (location.hash && anchorAbrir[location.hash.slice(1)]) { window.addEventListener('DOMContentLoaded', () => anchorAbrir[location.hash.slice(1)]()); }

// ASCOM INFORMA
async function carregarNoticias() {
    const grid = document.getElementById('news-grid');
    if (!grid) return;
    try {
        const news = await request('/api/news');
        grid.innerHTML = news.length ? news.slice(0, 6).map(item => `<div class="news-item"><img src="${escapeHtml(item.image || 'images/pf.jpg')}" class="news-img" loading="lazy"><div class="news-content"><span class="news-tag">${escapeHtml(item.title)}</span><p class="news-text">${escapeHtml(item.summary || item.description)}</p></div></div>`).join('') : '<div class="news-empty">Nenhum comunicado publicado no momento.</div>';
    } catch { grid.innerHTML = '<div class="news-empty">Serviço de comunicação temporariamente indisponível.</div>'; }
}

// ORGANOGRAMA (carregado uma vez por sessão) — linhas simples por nível
let orgCarregado = false;
async function carregarOrganograma() {
    if (orgCarregado) return;
    const container = document.getElementById('org-container');
    try {
        const items = await request('/api/organograma');
        const tiers = { 1: [], 2: [], 3: [] };
        items.forEach(item => { (tiers[item.tier] || tiers[3]).push(item); });
        const labels = { 1: 'DIREÇÃO-GERAL', 2: 'COORDENAÇÕES E CONTROLE', 3: 'UNIDADES DE EXECUÇÃO' };
        const icons = { 1: 'fa-star', 2: 'fa-shield', 3: 'fa-user-shield' };
        container.innerHTML = [1, 2, 3].filter(t => tiers[t].length).map(t => `<div class="org-section-title"><span>${labels[t]}</span></div><div class="org-row">${tiers[t].map(node => `<div class="org-box tier-${t}"><span class="org-tier-label"><i class="fas ${icons[t]}"></i></span><div class="org-name">${escapeHtml(node.title)}</div><div class="org-cargo">${escapeHtml(node.description)}</div></div>`).join('')}</div><div class="org-line-vertical"></div>`).join('') + '<div class="footer-restrito">Acesso restrito - Departamento de Inteligência</div>';
        orgCarregado = true;
    } catch { container.innerHTML = '<p style="text-align:center;color:#888">Estrutura organizacional indisponível no momento.</p>'; }
}

// ORDEM DO MÉRITO
let medalhasCarregadas = false;
async function carregarMedalhas() {
    if (medalhasCarregadas) return;
    const grid = document.getElementById('medalhas-grid');
    try {
        const items = await request('/api/medalhas');
        const sorted = [...items].sort((a, b) => (a.tier || 0) - (b.tier || 0));
        const cores = ['#f1c40f', '#e5e5e5', '#cd7f32', '#c0c0c0', '#9e9e9e'];
        grid.innerHTML = sorted.map((item, index) => `<div class="medal-card"><div class="medal-icon"><i class="fas fa-award" style="color:${cores[index] || '#888'}"></i></div><div class="medal-info"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.description)}</p></div></div>`).join('') || '<p style="text-align:center;color:#888">Nenhuma condecoração publicada.</p>';
        medalhasCarregadas = true;
    } catch { grid.innerHTML = '<p style="text-align:center;color:#888">Condecorações indisponíveis no momento.</p>'; }
}

// UNIDADES ESPECIAIS
let unidadesCarregadas = false;
const unidadeIcones = { 1: ['fa-user-shield', 'icon-gto'], 2: ['fa-water', 'icon-nupam'], 3: ['fa-bolt', 'icon-gri'], 4: ['fa-helicopter', 'icon-cao'] };
async function carregarUnidades() {
    if (unidadesCarregadas) return;
    const container = document.getElementById('unidades-container');
    try {
        const items = await request('/api/unidades');
        const sorted = [...items].sort((a, b) => (a.tier || 0) - (b.tier || 0));
        container.innerHTML = sorted.map(item => { const [icon, cls] = unidadeIcones[item.tier] || ['fa-shield', ''];
            return `<div class="unidade-card"><div class="icon-box ${cls}"><i class="fas ${icon}"></i></div><div class="unidade-info"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></div></div>`;
        }).join('') || '<p style="text-align:center;color:#888">Nenhuma unidade publicada.</p>';
        unidadesCarregadas = true;
    } catch { container.innerHTML = '<p style="text-align:center;color:#888">Unidades indisponíveis no momento.</p>'; }
}

// CONFIGURAÇÕES GERAIS DO SITE (stats da home e dados da sede)
async function carregarConfig() {
    try {
        const cfg = await request('/api/config');
        const map = { 'cfg-prisoes': cfg.statPrisoes, 'cfg-entorpecentes': cfg.statEntorpecentes, 'cfg-armas': cfg.statArmas, 'cfg-operacoes': cfg.statOperacoes, 'cfg-endereco': cfg.sedeEndereco, 'cfg-plantao': cfg.sedePlantao };
        Object.entries(map).forEach(([id, value]) => { const el = document.getElementById(id); if (el && value) el.textContent = value; });
    } catch { /* mantém valores padrão exibidos no HTML */ }
}

// PAINEL DE MONITORAMENTO — checagem de conexão
function nowHms() { return new Date().toTimeString().slice(0, 8); }
function logRow(level, label, msg) { return `<div class="mon-log-row"><span class="mon-log-time">${nowHms()}</span><span class="mon-log-level ${level}">${label}</span><span class="mon-log-msg">${msg}</span></div>`; }
function deployTatico() {
    const log = document.getElementById('term-log');
    const rd = document.getElementById('st-rede');
    const db = document.getElementById('st-db');
    const dot = document.getElementById('state-dot');
    if (!log) return;
    log.innerHTML = '';
    rd.className = 'mon-badge warn'; rd.innerHTML = '<i></i>Rede verificando';
    db.className = 'mon-badge warn'; db.innerHTML = '<i></i>Sincronia checando';
    if (dot) dot.style.background = '#f1c40f';
    const msgs = ['canal seguro autenticado', 'node institucional validado', 'registros sincronizados', 'verificação concluída'];
    let idx = 0;
    function addLine() {
        if (idx < msgs.length) {
            const row = document.createElement('div');
            row.className = 'line-up';
            row.innerHTML = logRow('ok', 'OK', msgs[idx]);
            log.appendChild(row);
            idx++;
            setTimeout(addLine, 350);
        } else {
            rd.className = 'mon-badge ok'; rd.innerHTML = '<i></i>Rede protegida';
            db.className = 'mon-badge ok'; db.innerHTML = '<i></i>Sincronia ativa';
            if (dot) dot.style.background = '#3fb950';
        }
    }
    addLine();
}

carregarNoticias();
carregarConfig();

// BARRA DE ADMIN (aparece no canto superior quando logado)
async function verificarSessaoAdmin() {
    try {
        const { user } = await request('/api/me');
        if (!user) return;
        const bar = document.createElement('div');
        bar.id = 'admin-bar';
        bar.innerHTML = `<span>Sessão: <strong>${escapeHtml(user.name || user.username)}</strong> (${escapeHtml(user.role)})</span><a href="/painel-e3f6b8e4bf">Editar conteúdo do site ↗</a>`;
        document.body.prepend(bar);
        document.body.classList.add('has-admin-bar');
    } catch { /* sem sessão ativa */ }
}
verificarSessaoAdmin();

// RELÓGIO DA BARRA SUPERIOR
function atualizarRelogioNav() {
    const el = document.getElementById('nav-clock');
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleDateString('pt-BR') + ' · ' + now.toLocaleTimeString('pt-BR');
}
atualizarRelogioNav();
setInterval(atualizarRelogioNav, 1000);
