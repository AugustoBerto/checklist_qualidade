const assert = require('node:assert/strict');
const { test, describe } = require('node:test');
const { withTransaction } = require('../database/transaction');
const { isPgError, isRetryablePgError, mensagemPostgres } = require('../database/errors');
const {
  listMigrationFiles,
  readMigrationSql,
  validateMigrationSet,
  validateApplied,
  initDatabase,
  migrateDatabase,
  statusDatabase
} = require('../scripts/db');

describe('fundação DB', () => {
  test('withTransaction faz commit e sempre libera o cliente', async () => {
    const calls = [];
    const client = {
      query: async (sql) => { calls.push(sql); },
      release: () => calls.push('release')
    };
    const pool = { connect: async () => client };
    const result = await withTransaction(pool, async (tx) => {
      await tx.query('SELECT 1');
      return 42;
    });
    assert.equal(result, 42);
    assert.deepEqual(calls, ['BEGIN', 'SELECT 1', 'COMMIT', 'release']);
  });

  test('withTransaction faz rollback quando o trabalho falha', async () => {
    const calls = [];
    const client = {
      query: async (sql) => { calls.push(sql); },
      release: () => calls.push('release')
    };
    await assert.rejects(
      withTransaction({ connect: async () => client }, async () => { throw new Error('falha esperada'); }),
      /falha esperada/
    );
    assert.deepEqual(calls, ['BEGIN', 'ROLLBACK', 'release']);
  });

  test('mapeia erros PostgreSQL sem devolver detalhes sensíveis', () => {
    assert.equal(isPgError({ code: '23505', detail: 'secret value' }), true);
    assert.equal(isRetryablePgError({ code: '40001' }), true);
    assert.equal(mensagemPostgres({ code: '23503', detail: 'private row' }), 'Registro relacionado não encontrado ou ainda utilizado.');
  });

  test('descobre somente 001 e migrations futuras, preservando 002-004', () => {
    const migrations = validateMigrationSet(listMigrationFiles());
    assert.deepEqual(migrations.map(({ version }) => version), [1, 5]);
    assert.match(readMigrationSql(migrations[0]), /^CREATE SCHEMA checklist_app;/);
    assert.doesNotMatch(readMigrationSql(migrations[0]), /^BEGIN;/);
    assert.doesNotMatch(readMigrationSql(migrations[0]), /COMMIT;\s*$/);
  });

  test('integra init, migrate, status e recusa init repetido no PostgreSQL de teste', { skip: process.env.RUN_DB_INTEGRATION !== '1' }, async () => {
    const env = {
      DB_HOST: process.env.DB_TEST_HOST || '127.0.0.1',
      DB_PORT: process.env.DB_TEST_PORT || '55432',
      DB_USER: process.env.DB_TEST_USER || 'checklist_test',
      DB_PASSWORD: process.env.DB_TEST_PASSWORD || 'checklist_test_only',
      DB_DATABASE: process.env.DB_TEST_DATABASE || 'checklist_test',
      DB_SCHEMA: process.env.DB_TEST_SCHEMA || 'checklist_app'
    };
    const first = await initDatabase({ env });
    assert.deepEqual(first.applied, ['001_initial_schema.sql']);
    await assert.rejects(initDatabase({ env }), /db:init recusado/);
    const migrated = await migrateDatabase({ env });
    assert.deepEqual(migrated.applied, ['005_add_operational_indexes.sql']);
    const status = await statusDatabase({ env });
    assert.equal(status.initialized, true);
    assert.deepEqual(status.migrations.map((item) => item.applied), [true, true]);
  });
});
