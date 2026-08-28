const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createPool, DB_SCHEMA } = require('../db');
const { withTransaction } = require('../database/transaction');

const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');
const schemaMigrationsSql = (schema = 'checklist_app') => `
  CREATE TABLE IF NOT EXISTS ${schema}.schema_migrations (
    version integer PRIMARY KEY,
    name varchar(255) NOT NULL UNIQUE,
    checksum char(64) NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`;
const migrationNumber = (name) => Number(name.slice(0, name.indexOf('_')));
const isSupportedMigration = (name) => /^\d{3,}_[a-z0-9_-]+\.sql$/i.test(name);

const listMigrationFiles = (directory = MIGRATIONS_DIR) => fs.readdirSync(directory)
  .filter((name) => isSupportedMigration(name))
  .map((name) => ({
    version: migrationNumber(name),
    name,
    file: path.join(directory, name),
    checksum: crypto.createHash('sha256').update(fs.readFileSync(path.join(directory, name))).digest('hex')
  }))
  .sort((a, b) => a.version - b.version);

const validateMigrationSet = (migrations) => {
  if (!migrations.length || migrations[0].version !== 1) throw new Error('Migration 001_initial_schema.sql é obrigatória.');
  for (let index = 1; index < migrations.length; index += 1) {
    if (migrations[index].version === migrations[index - 1].version) {
      throw new Error(`Há mais de uma migration para a versão ${migrations[index].version}.`);
    }
  }
  return migrations;
};

const readMigrationSql = (migration) => fs.readFileSync(migration.file, 'utf8')
  .replace(/^\s*BEGIN\s*;\s*/i, '')
  .replace(/\s*COMMIT\s*;\s*$/i, '');

const migrationSqlForSchema = (migration, schema) => readMigrationSql(migration)
  .replace(/\bchecklist_app\b/g, schema);

const assertIdentifier = (value) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error('DB_SCHEMA deve ser um identificador PostgreSQL válido');
  return value;
};

const schemaExists = async (client, schema) => {
  const result = await client.query('SELECT to_regnamespace($1)::text AS schema', [schema]);
  return Boolean(result.rows[0]?.schema);
};

const safeDbError = (error) => {
  if (error?.code === 'ECONNREFUSED') return new Error('Não foi possível conectar ao PostgreSQL.');
  if (error?.code === '3D000') return new Error('O banco PostgreSQL configurado não existe.');
  if (error?.code === '42501') return new Error('O usuário PostgreSQL não possui permissão suficiente.');
  return new Error('Falha na operação de banco de dados.');
};

async function initDatabase({ pool, env = process.env, migrationsDir = MIGRATIONS_DIR, schema = DB_SCHEMA } = {}) {
  const ownedPool = pool || createPool(env);
  assertIdentifier(schema);
  const migrations = validateMigrationSet(listMigrationFiles(migrationsDir));
  const initial = migrations.find((migration) => migration.version === 1);
  try {
    if (await schemaExists(ownedPool, schema)) throw new Error(`O schema ${schema} já existe; db:init recusado.`);

    await withTransaction(ownedPool, async (client) => {
      await client.query(migrationSqlForSchema(initial, schema));
      await client.query(schemaMigrationsSql(schema));
      await client.query(
        `INSERT INTO ${schema}.schema_migrations (version, name, checksum) VALUES ($1, $2, $3)`,
        [initial.version, initial.name, initial.checksum]
      );
    });
    return { schema, applied: [initial.name] };
  } catch (error) {
    if (error.message?.includes('db:init recusado')) throw error;
    throw safeDbError(error);
  } finally {
    if (!pool) await ownedPool.end();
  }
}

const readApplied = async (pool, schema) => {
  const table = await pool.query('SELECT to_regclass($1)::text AS table', [`${schema}.schema_migrations`]);
  if (!table.rows[0]?.table) throw new Error('Schema sem schema_migrations; execute db:init somente em banco vazio.');
  const result = await pool.query(`SELECT version, name, checksum, applied_at FROM ${schema}.schema_migrations ORDER BY version`);
  return result.rows;
};

const validateApplied = (applied, migrations) => {
  const known = new Map(migrations.map((migration) => [migration.version, migration]));
  const seen = new Set();
  for (const row of applied) {
    if (seen.has(row.version)) throw new Error(`Versão de migration duplicada: ${row.version}.`);
    seen.add(row.version);
    const migration = known.get(row.version);
    if (!migration || migration.name !== row.name) throw new Error(`Migration registrada não pertence ao conjunto suportado: ${row.name}.`);
    if (migration.checksum !== row.checksum) throw new Error(`Checksum divergente na migration ${row.name}.`);
  }
  const first = applied[0];
  if (first && first.version !== 1) throw new Error('A migration 001 precisa ser a primeira migration registrada.');
};

async function migrateDatabase({ pool, env = process.env, migrationsDir = MIGRATIONS_DIR, schema = DB_SCHEMA } = {}) {
  const ownedPool = pool || createPool(env);
  assertIdentifier(schema);
  const migrations = validateMigrationSet(listMigrationFiles(migrationsDir));
  try {
    if (!await schemaExists(ownedPool, schema)) throw new Error(`O schema ${schema} não existe; execute db:init.`);
    const applied = await readApplied(ownedPool, schema);
    validateApplied(applied, migrations);
    const appliedVersions = new Set(applied.map((row) => row.version));
    const pending = migrations.filter((migration) => !appliedVersions.has(migration.version));

    for (const migration of pending) {
      await withTransaction(ownedPool, async (client) => {
        await client.query(migrationSqlForSchema(migration, schema));
        await client.query(
          `INSERT INTO ${schema}.schema_migrations (version, name, checksum) VALUES ($1, $2, $3)`,
          [migration.version, migration.name, migration.checksum]
        );
      });
    }
    return { schema, applied: pending.map((migration) => migration.name), pending: [] };
  } catch (error) {
    if (error.message?.startsWith('O schema') || error.message?.startsWith('Schema ') || error.message?.startsWith('Migration') || error.message?.startsWith('Checksum') || error.message?.startsWith('A migration')) throw error;
    throw safeDbError(error);
  } finally {
    if (!pool) await ownedPool.end();
  }
}

async function statusDatabase({ pool, env = process.env, migrationsDir = MIGRATIONS_DIR, schema = DB_SCHEMA } = {}) {
  const ownedPool = pool || createPool(env);
  assertIdentifier(schema);
  const migrations = validateMigrationSet(listMigrationFiles(migrationsDir));
  try {
    if (!await schemaExists(ownedPool, schema)) return { schema, initialized: false, migrations: [] };
    const applied = await readApplied(ownedPool, schema);
    validateApplied(applied, migrations);
    const byVersion = new Map(applied.map((row) => [row.version, row]));
    return {
      schema,
      initialized: true,
      migrations: migrations.map((migration) => ({
        version: migration.version,
        name: migration.name,
        checksum: migration.checksum,
        applied: byVersion.has(migration.version),
        appliedAt: byVersion.get(migration.version)?.applied_at || null
      }))
    };
  } catch (error) {
    if (error.message?.startsWith('Schema ') || error.message?.startsWith('Migration') || error.message?.startsWith('Checksum') || error.message?.startsWith('A migration')) throw error;
    throw safeDbError(error);
  } finally {
    if (!pool) await ownedPool.end();
  }
}

async function main(command = process.argv[2]) {
  if (!['init', 'migrate', 'status'].includes(command)) throw new Error('Uso: node scripts/db.js <init|migrate|status>');
  const result = command === 'init' ? await initDatabase() : command === 'migrate' ? await migrateDatabase() : await statusDatabase();
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  MIGRATIONS_DIR,
  schemaMigrationsSql,
  listMigrationFiles,
  readMigrationSql,
  migrationSqlForSchema,
  validateMigrationSet,
  validateApplied,
  initDatabase,
  migrateDatabase,
  statusDatabase
};
