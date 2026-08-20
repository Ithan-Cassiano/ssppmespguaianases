const crypto = require('crypto');

// Vercel roda cada requisição numa função isolada (sem memória compartilhada
// entre chamadas), então sessão em Map() não sobrevive. Em vez de guardar
// sessão no servidor, o cookie carrega o usuário assinado com HMAC — o server
// só verifica a assinatura, sem precisar de tabela de sessões nem round-trip no banco.
const SESSION_SECRET = process.env.SESSION_SECRET;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h

if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET não definida. Gere um valor aleatório longo e configure como variável de ambiente.');
}

function base64url(input) { return Buffer.from(input).toString('base64url'); }

function sign(payloadB64) { return crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url'); }

function createSessionCookie(user) {
  const payload = { ...user, exp: Date.now() + SESSION_TTL_MS };
  const payloadB64 = base64url(JSON.stringify(payload));
  const signature = sign(payloadB64);
  return `${payloadB64}.${signature}`;
}

function verifySessionToken(token) {
  if (!token || !token.includes('.')) return null;
  const [payloadB64, signature] = token.split('.');
  const expected = sign(payloadB64);
  const a = Buffer.from(signature || '');
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) return null;
    const { exp, ...user } = payload;
    return user;
  } catch { return null; }
}

module.exports = { createSessionCookie, verifySessionToken, SESSION_TTL_MS };
