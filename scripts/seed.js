// Popula o Neon com o conteúdo que hoje está em data/db.json.
// Rode uma vez, localmente: node --env-file=.env scripts/seed.js
// Precisa de DATABASE_URL apontando pro seu banco Neon.
const fs = require('fs');
const path = require('path');
const db = require('../lib/db');

const COLLECTIONS = ['news', 'editais', 'resultados', 'denuncias', 'operacionais', 'servicos', 'solicitacoes', 'organograma', 'medalhas', 'unidades'];

async function main() {
  const raw = fs.readFileSync(path.join(__dirname, '..', 'data', 'db.json'), 'utf8');
  const data = JSON.parse(raw);

  await db.ensureSchema();

  for (const collection of COLLECTIONS) {
    const items = data[collection] || [];
    for (const item of items) {
      const existing = await db.getItem(collection, item.id);
      if (existing) { console.log(`(já existe) ${collection}/${item.id}`); continue; }
      await db.insertItem(collection, item);
      console.log(`inserido: ${collection}/${item.id}`);
    }
  }

  if (data.config) {
    await db.patchConfig(data.config);
    console.log('config aplicada');
  }

  for (const user of data.users || []) {
    const existing = await db.findUserByUsername(user.username);
    if (existing) { console.log(`(já existe) usuário ${user.username}`); continue; }
    await db.insertUser({
      id: String(user.id),
      username: user.username,
      password: user.password, // já vem hasheada (formato salt:hash) do db.json local
      name: user.name,
      role: user.role,
      permissions: user.permissions || [],
    });
    console.log(`usuário criado: ${user.username}`);
  }

  console.log('Seed concluído.');
}

main().catch(error => { console.error(error); process.exit(1); });
