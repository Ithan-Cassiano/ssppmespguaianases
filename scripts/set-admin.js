// Eleva um usuário existente a role=admin (acesso total, ignora permissions).
// Uso: DATABASE_URL="postgres://..." node scripts/set-admin.js <username>
const db = require('../lib/db');

(async () => {
  const username = process.argv[2];
  if (!username) { console.error('Uso: node scripts/set-admin.js <username>'); process.exit(1); }
  const user = await db.findUserByUsername(username);
  if (!user) { console.error('Usuário não encontrado:', username); process.exit(1); }
  console.log('Antes:', JSON.stringify({ username: user.username, role: user.role, permissions: user.permissions }));
  const updated = await db.updateUser(user.id, { role: 'admin', permissions: [] });
  console.log('Depois:', JSON.stringify({ username: updated.username, role: updated.role, permissions: updated.permissions }));
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });
