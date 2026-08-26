const assert = require('node:assert/strict');
const { after, test } = require('node:test');
const { createPool } = require('../../db');
const { initDatabase, statusDatabase } = require('../../scripts/db');
const createDadosService = require('../../services/dadosService');
const createCadastrosService = require('../../services/cadastrosService');

const database = process.env.DB_DATABASE || '';
if (!database.endsWith('_test')) throw new Error('Integração recusada fora de banco com sufixo _test.');

const pool = createPool(process.env);
after(async () => pool.end());

test('baseline consolidado deixa o schema operacional', async () => {
  const status = await statusDatabase({ pool, env: process.env });
  assert.equal(status.initialized, true);
  assert.deepEqual(status.migrations.map(({ applied }) => applied), [true]);

  const column = await pool.query(`
    SELECT data_type, column_default
      FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = 'unidades' AND column_name = 'ativo'
  `, [process.env.DB_SCHEMA || 'checklist_app']);
  assert.equal(column.rowCount, 1);
  assert.equal(column.rows[0].data_type, 'integer');

  const indexes = await pool.query(`
    SELECT indexname FROM pg_indexes
     WHERE schemaname = $1
       AND indexname IN ('modelo_ativo_nome_idx', 'celulas_ativo_nome_idx', 'formulario_submissoes_celula_data_idx')
  `, [process.env.DB_SCHEMA || 'checklist_app']);
  assert.equal(indexes.rowCount, 3);
  await assert.rejects(initDatabase({ pool, env: process.env }), /db:init recusado/);
});

test('repositories executam filtros e preservam ativo omitido no PostgreSQL real', async () => {
  const marca = (await pool.query("INSERT INTO marcas (nome) VALUES ('MARCA INTEGRACAO') RETURNING id")).rows[0];
  const setor = (await pool.query("INSERT INTO setores (nome, ativo) VALUES ('SETOR INTEGRACAO', 1) RETURNING id")).rows[0];
  const modelo = (await pool.query(`
    INSERT INTO modelo (nome, marca, id_marca_fk, id_setor_fk, ativo)
    VALUES ('MODELO INTEGRACAO', $1, $2, $3, true) RETURNING id
  `, [String(marca.id), marca.id, setor.id])).rows[0];

  const dados = createDadosService({ db: pool });
  const filtrados = await dados.listarModelosAtivos({ marca_id: String(marca.id), setor_id: String(setor.id), q: 'MODELO' });
  assert.equal(filtrados.status, 200);
  assert.deepEqual(filtrados.body.modelos.map(({ id }) => id), [modelo.id]);

  const cadastros = createCadastrosService({ db: pool });
  const atualizado = await cadastros.atualizarSetor(setor.id, { nome: 'SETOR RENOMEADO' });
  assert.equal(atualizado.status, 200);
  assert.equal(atualizado.body.setor.ativo, 1);
});
