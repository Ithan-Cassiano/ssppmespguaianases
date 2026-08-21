// Diagnóstico: lista usuários do Neon (username, role, permissions). Só leitura.
// Uso: DATABASE_URL="postgres://..." node scripts/list-users.js
const db = require('../lib/db');

(async () => {
  const users = await db.listUsers();
  for (const user of users) {
    console.log(JSON.stringify({ id: user.id, username: user.username, name: user.name, role: user.role, permissions: user.permissions }));
  }
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });
