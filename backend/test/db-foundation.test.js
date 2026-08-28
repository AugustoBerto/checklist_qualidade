const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { test, describe } = require('node:test');
const { withTransaction } = require('../database/transaction');
const { createPool, registrarErroPool } = require('../db');
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
  test('pool registra erros assíncronos sem emitir uncaught error', () => {
    const pool = new EventEmitter();
    const erros = [];
    registrarErroPool(pool, { error: (mensagem) => erros.push(mensagem) });
    const erro = new Error('conexão encerrada');

    pool.emit('error', erro);

    assert.deepEqual(erros, ['Erro assíncrono do pool PostgreSQL: conexão encerrada']);
  });

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

  test('descobre as migrations em ordem', () => {
    const migrations = validateMigrationSet(listMigrationFiles());
    assert.deepEqual(migrations.map(({ version }) => version), [1, 2, 3, 4, 5, 6, 7]);
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
    const migrationEnv = { ...env, DB_SCHEMA: `${env.DB_TEST_SCHEMA || 'checklist_app'}_marca` };
    const pool = createPool(migrationEnv);
    try {
      await pool.query(`DROP SCHEMA IF EXISTS ${migrationEnv.DB_SCHEMA} CASCADE`);

      const first = await initDatabase({ pool, env: migrationEnv });
      assert.deepEqual(first.applied, ['001_initial_schema.sql']);
      await assert.rejects(initDatabase({ pool, env: migrationEnv }), /db:init recusado/);

      const marcas = await pool.query(`
        INSERT INTO ${migrationEnv.DB_SCHEMA}.marcas (nome)
        VALUES ('MARCA ÚNICA'), ('DUPLICADA'), ('DUPLICADA')
        RETURNING id, nome
      `);
      const [unica, duplicadaA] = marcas.rows;
      await pool.query(`
        INSERT INTO ${migrationEnv.DB_SCHEMA}.modelo (nome, marca, id_marca_fk, id_setor_fk)
        VALUES
          ('NUMÉRICO', $1, NULL, NULL),
          ('NOME', ' marca única ', NULL, NULL),
          ('DESCONHECIDO', 'SEM CORRESPONDÊNCIA', NULL, NULL),
          ('AMBÍGUO', 'duplicada', NULL, NULL),
          ('PRESERVADO', 'LEGADO', $2, NULL)
      `, [String(unica.id), duplicadaA.id]);

      const migrated = await migrateDatabase({ pool, env: migrationEnv });
      assert.deepEqual(migrated.applied, ['002_modelo_marca_fk.sql', '003_categorias_padrao.sql', '004_marca_logo.sql', '005_modelo_versao_assinatura_mime.sql', '006_formulario_evidencias.sql', '007_remover_assinatura_path.sql']);
      const modelos = await pool.query(`
        SELECT nome, marca, id_marca_fk
        FROM ${migrationEnv.DB_SCHEMA}.modelo
        ORDER BY nome
      `);
      const porNome = new Map(modelos.rows.map((modelo) => [modelo.nome, modelo]));
      assert.equal(porNome.get('NUMÉRICO').id_marca_fk, unica.id);
      assert.equal(porNome.get('NOME').id_marca_fk, unica.id);
      assert.equal(porNome.get('DESCONHECIDO').id_marca_fk, null);
      assert.equal(porNome.get('DESCONHECIDO').marca, 'SEM CORRESPONDÊNCIA');
      assert.equal(porNome.get('AMBÍGUO').id_marca_fk, null);
      assert.equal(porNome.get('PRESERVADO').id_marca_fk, duplicadaA.id);

      const status = await statusDatabase({ pool, env: migrationEnv });
      assert.equal(status.initialized, true);
      assert.deepEqual(status.migrations.map((item) => item.applied), [true, true, true, true, true, true, true]);
    } finally {
      await pool.query(`DROP SCHEMA IF EXISTS ${migrationEnv.DB_SCHEMA} CASCADE`);
      await pool.end();
    }
  });
});
