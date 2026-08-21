// Redefine a senha de um usuário existente.
// Uso: DATABASE_URL="postgres://..." node scripts/reset-password.js <username> <nova-senha>
const db = require('../lib/db');
const { hashPassword } = require('../lib/password');

(async () => {
  const [username, newPassword] = process.argv.slice(2);
  if (!username || !newPassword) { console.error('Uso: node scripts/reset-password.js <username> <nova-senha>'); process.exit(1); }
  if (newPassword.length < 8) { console.error('A senha deve ter no mínimo 8 caracteres.'); process.exit(1); }
  const user = await db.findUserByUsername(username);
  if (!user) { console.error('Usuário não encontrado:', username); process.exit(1); }
  await db.updateUser(user.id, { password: hashPassword(newPassword) });
  console.log('Senha redefinida para', username);
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });
