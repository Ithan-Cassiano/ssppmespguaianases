const { neon } = require('@neondatabase/serverless');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não definida. Configure a connection string do Neon como variável de ambiente.');
}

const sql = neon(process.env.DATABASE_URL);
let schemaReady = null;

// Uma linha por registro, guardado como JSONB — cada "coleção" (news, editais,
// organograma, denuncias...) é só um filtro por essa coluna. Isso preserva o
// mesmo formato flexível que o db.json tinha, sem precisar de uma tabela por módulo.
async function ensureSchema() {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    await sql`CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      collection TEXT NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS items_collection_idx ON items (collection, created_at DESC)`;
    await sql`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      role TEXT NOT NULL,
      permissions JSONB NOT NULL DEFAULT '[]'
    )`;
    await sql`CREATE TABLE IF NOT EXISTS login_attempts (
      ip TEXT PRIMARY KEY,
      count INT NOT NULL,
      first_attempt TIMESTAMPTZ NOT NULL
    )`;
  })();
  return schemaReady;
}

async function getCollection(collection) {
  await ensureSchema();
  const rows = await sql`SELECT data FROM items WHERE collection = ${collection} ORDER BY created_at DESC`;
  return rows.map(row => row.data);
}

async function getItem(collection, id) {
  await ensureSchema();
  const rows = await sql`SELECT data FROM items WHERE collection = ${collection} AND id = ${id} LIMIT 1`;
  return rows[0]?.data || null;
}

async function insertItem(collection, item) {
  await ensureSchema();
  await sql`INSERT INTO items (id, collection, data, created_at) VALUES (${item.id}, ${collection}, ${JSON.stringify(item)}, ${item.createdAt})`;
  return item;
}

async function updateItem(collection, id, patch) {
  await ensureSchema();
  const current = await getItem(collection, id);
  if (!current) return null;
  const merged = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await sql`UPDATE items SET data = ${JSON.stringify(merged)} WHERE collection = ${collection} AND id = ${id}`;
  return merged;
}

async function deleteItem(collection, id) {
  await ensureSchema();
  await sql`DELETE FROM items WHERE collection = ${collection} AND id = ${id}`;
}

async function getConfig() {
  const item = await getItem('config', 'site');
  return item || {};
}

async function patchConfig(patch) {
  await ensureSchema();
  const current = await getConfig();
  const merged = { ...current, ...patch, id: 'site', createdAt: current.createdAt || new Date().toISOString() };
  await sql`INSERT INTO items (id, collection, data, created_at)
            VALUES ('site', 'config', ${JSON.stringify(merged)}, ${merged.createdAt})
            ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(merged)}`;
  return merged;
}

async function findUserByUsername(username) {
  await ensureSchema();
  const rows = await sql`SELECT * FROM users WHERE username = ${username} LIMIT 1`;
  return rows[0] || null;
}

async function findUserById(id) {
  await ensureSchema();
  const rows = await sql`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
  return rows[0] || null;
}

async function listUsers() {
  await ensureSchema();
  return sql`SELECT * FROM users ORDER BY username`;
}

async function insertUser(user) {
  await ensureSchema();
  await sql`INSERT INTO users (id, username, password, name, role, permissions) VALUES (${user.id}, ${user.username}, ${user.password}, ${user.name}, ${user.role}, ${JSON.stringify(user.permissions)})`;
  return user;
}

async function updateUser(id, patch) {
  await ensureSchema();
  const current = await findUserById(id);
  if (!current) return null;
  const merged = { ...current, ...patch };
  await sql`UPDATE users SET username = ${merged.username}, name = ${merged.name}, role = ${merged.role}, permissions = ${JSON.stringify(merged.permissions)}, password = ${merged.password} WHERE id = ${id}`;
  return merged;
}

async function loginAttemptGet(ip) {
  await ensureSchema();
  const rows = await sql`SELECT * FROM login_attempts WHERE ip = ${ip} LIMIT 1`;
  return rows[0] || null;
}

async function loginAttemptSet(ip, count, firstAttempt) {
  await ensureSchema();
  await sql`INSERT INTO login_attempts (ip, count, first_attempt) VALUES (${ip}, ${count}, ${firstAttempt})
            ON CONFLICT (ip) DO UPDATE SET count = ${count}, first_attempt = ${firstAttempt}`;
}

async function loginAttemptClear(ip) {
  await ensureSchema();
  await sql`DELETE FROM login_attempts WHERE ip = ${ip}`;
}

module.exports = {
  ensureSchema, getCollection, getItem, insertItem, updateItem, deleteItem,
  getConfig, patchConfig,
  findUserByUsername, findUserById, listUsers, insertUser, updateUser,
  loginAttemptGet, loginAttemptSet, loginAttemptClear,
};
