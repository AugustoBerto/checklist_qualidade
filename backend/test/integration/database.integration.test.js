const assert = require('node:assert/strict');
const { after, test } = require('node:test');
const pool = require('../../db');
const { initDatabase, statusDatabase } = require('../../scripts/db');
const dados = require('../../controllers/DadosController');
const cadastros = require('../../controllers/CadastrosController');

const database = process.env.DB_DATABASE || '';
if (!database.endsWith('_test')) throw new Error('Integração recusada fora de banco com sufixo _test.');

after(async () => pool.end());

const resposta = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test('baseline consolidado deixa o schema operacional', async () => {
  const status = await statusDatabase({ pool, env: process.env });
  assert.equal(status.initialized, true);
  assert.deepEqual(status.migrations.map(({ applied }) => applied), [true, true, true, true]);

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

test('controllers executam filtros e atualizações no PostgreSQL real', async () => {
  const marca = (await pool.query("INSERT INTO marcas (nome) VALUES ('MARCA INTEGRACAO') RETURNING id")).rows[0];
  const setor = (await pool.query("INSERT INTO setores (nome, ativo) VALUES ('SETOR INTEGRACAO', 1) RETURNING id")).rows[0];
  const modelo = (await pool.query(`
    INSERT INTO modelo (nome, marca, id_marca_fk, id_setor_fk, ativo)
    VALUES ('MODELO INTEGRACAO', $1, $2, $3, true) RETURNING id
  `, [String(marca.id), marca.id, setor.id])).rows[0];

  const filtrados = resposta();
  await dados.listarModelosAtivos({ query: { marca_id: String(marca.id), setor_id: String(setor.id) } }, filtrados);
  assert.equal(filtrados.statusCode, 200);
  assert.deepEqual(filtrados.body.dados.map(({ id }) => id), [modelo.id]);

  const atualizado = resposta();
  await cadastros.atualizarSetor({ params: { id: setor.id }, body: { nome: 'SETOR RENOMEADO', ativo: true } }, atualizado);
  assert.equal(atualizado.statusCode, 200);
  assert.equal(atualizado.body.setor.ativo, 1);
});

test('criação de modelos sincroniza categoria padrão concorrente com UPSERT', async () => {
  const sufixo = `${Date.now()}_${process.pid}`;
  const nomeMarca = `MARCA TASK3 ${sufixo}`;
  const nomeSetor = `SETOR TASK3 ${sufixo}`;
  const nomeCategoria = `CATEGORIA TASK3 ${sufixo}`;
  const nomesModelo = [`MODELO TASK3 A ${sufixo}`, `MODELO TASK3 B ${sufixo}`];
  const marca = (await pool.query('INSERT INTO marcas (nome) VALUES ($1) RETURNING id', [nomeMarca])).rows[0];
  const setor = (await pool.query('INSERT INTO setores (nome, ativo) VALUES ($1, 1) RETURNING id', [nomeSetor])).rows[0];
  const respostas = [];

  for (const [indice, nomeModelo] of nomesModelo.entries()) {
    const res = resposta();
    await cadastros.criarModelo({ body: {
      nomeModelo,
      id_marca_fk: marca.id,
      id_setor: setor.id,
      categorias: { [nomeCategoria]: { ctq: false, perguntas: [`Pergunta TASK3 ${indice + 1}`] } },
    } }, res);
    respostas.push(res);
  }

  assert.deepEqual(respostas.map(({ statusCode }) => statusCode), [201, 201]);

  const catalogo = await pool.query(
    `SELECT id FROM categorias_padrao
      WHERE LOWER(TRIM(nome)) = LOWER(TRIM($1)) AND ativo = 1`,
    [nomeCategoria]
  );
  assert.equal(catalogo.rowCount, 1);

  const persistidos = await pool.query(
    `SELECT m.nome, p.pergunta
       FROM modelo m
       JOIN categorias c ON c.id_modelo = m.id
       JOIN perguntas p ON p.id_categoria = c.id AND p.ativo = 1
      WHERE m.nome = ANY($1::text[]) AND c.categoria = $2
      ORDER BY m.nome`,
    [nomesModelo, nomeCategoria]
  );
  assert.deepEqual(persistidos.rows, nomesModelo.map((nomeModelo, indice) => ({
    nome: nomeModelo,
    pergunta: `Pergunta TASK3 ${indice + 1}`,
  })));
});
