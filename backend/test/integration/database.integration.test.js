const assert = require('node:assert/strict');
const { after, test } = require('node:test');
const pool = require('../../db');
const { DB_SCHEMA } = pool;
const { initDatabase, statusDatabase } = require('../../scripts/db');
const dados = require('../../controllers/DadosController');
const cadastros = require('../../controllers/CadastrosController');
const perfis = require('../../controllers/PerfisController');
process.env.CHECKLIST_INITIAL_ADMIN_MATRICULA = 'bootstrap-integration';
const autorizar = require('../../middlewares/auth');

const database = (() => {
  try { return new URL(process.env.DATABASE_URL).pathname.slice(1); } catch { return ''; }
})();
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
  assert.deepEqual(status.migrations.map(({ applied }) => applied), [true, true, true, true, true, true, true, true, true]);

  const modeloVersion = await pool.query(`
    SELECT data_type, column_default
      FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = 'modelo' AND column_name = 'versao'
  `, [DB_SCHEMA]);
  assert.equal(modeloVersion.rowCount, 1);
  assert.equal(modeloVersion.rows[0].data_type, 'integer');
  assert.equal(modeloVersion.rows[0].column_default, '1');

  const categoriaOrdem = await pool.query(`
    SELECT data_type, column_default, is_nullable
      FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = 'categorias' AND column_name = 'ordem'
  `, [DB_SCHEMA]);
  assert.equal(categoriaOrdem.rowCount, 1);
  assert.equal(categoriaOrdem.rows[0].data_type, 'integer');
  assert.equal(categoriaOrdem.rows[0].column_default, '1');
  assert.equal(categoriaOrdem.rows[0].is_nullable, 'NO');

  const assinaturaMime = await pool.query(`
    SELECT data_type
      FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = 'formulario_submissoes' AND column_name = 'assinatura_mime'
  `, [DB_SCHEMA]);
  assert.equal(assinaturaMime.rowCount, 1);
  assert.equal(assinaturaMime.rows[0].data_type, 'character varying');

  const evidencias = await pool.query('SELECT to_regclass($1)::text AS tabela', [
    `${DB_SCHEMA}.formulario_evidencias`,
  ]);
  assert.ok(evidencias.rows[0].tabela);

  const column = await pool.query(`
    SELECT data_type, column_default
      FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = 'unidades' AND column_name = 'ativo'
  `, [DB_SCHEMA]);
  assert.equal(column.rowCount, 1);
  assert.equal(column.rows[0].data_type, 'integer');

  const indexes = await pool.query(`
    SELECT indexname FROM pg_indexes
     WHERE schemaname = $1
       AND indexname IN ('modelo_ativo_nome_idx', 'celulas_ativo_nome_idx', 'formulario_submissoes_celula_data_idx')
  `, [DB_SCHEMA]);
  assert.equal(indexes.rowCount, 3);
  await assert.rejects(initDatabase({ pool, env: process.env }), /db:init recusado/);
});

test('modo fechado cria somente o administrador inicial e não persiste desconhecidos', async () => {
  try {
    const admin = await autorizar.buscarOuCriarPerfilBootstrap({
      matricula: 'bootstrap-integration', nome: 'Bootstrap Integração', funcao: 'Administrador',
    });
    assert.equal(admin.papel, 'ADMIN');
    assert.equal(Number(admin.ativo), 1);

    const desconhecido = await autorizar.buscarOuCriarPerfilBootstrap({ matricula: 'sem-cadastro-integration' });
    assert.equal(desconhecido, null);
    const persistido = await pool.query('SELECT id FROM usuarios WHERE matricula = $1', ['sem-cadastro-integration']);
    assert.equal(persistido.rowCount, 0);
  } finally {
    await pool.query('DELETE FROM usuarios WHERE matricula = $1', ['bootstrap-integration']);
  }
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
  const respostas = await Promise.all(nomesModelo.map(async (nomeModelo, indice) => {
    const res = resposta();
    await cadastros.criarModelo({ body: {
      nomeModelo,
      id_marca_fk: marca.id,
      id_setor: setor.id,
      categorias: { [nomeCategoria]: { ctq: false, perguntas: [`Pergunta TASK3 ${indice + 1}`] } },
    } }, res);
    return res;
  }));

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

test('duas remoções concorrentes preservam um administrador ativo', async () => {
  const sufixo = `${Date.now()}_${process.pid}`;
  const { rows } = await pool.query(`
    INSERT INTO usuarios (nome, matricula, papel, ativo)
    VALUES ($1, $2, 'ADMIN', 1), ($3, $4, 'ADMIN', 1)
    RETURNING id
  `, [`ADMIN A ${sufixo}`, `admin-a-${sufixo}`, `ADMIN B ${sufixo}`, `admin-b-${sufixo}`]);
  const body = {
    papel: 'LIDER', ativo: true,
    id_unidade_fk: null, id_setor_fk: null, id_celula_fk: null, id_turno_fk: null,
  };
  const respostas = await Promise.all(rows.map(async ({ id }) => {
    const res = resposta();
    await perfis.atualizar({ params: { id }, body }, res);
    return res;
  }));

  assert.deepEqual(respostas.map(({ statusCode }) => statusCode).sort(), [200, 409]);
  const ativos = await pool.query("SELECT count(*)::int AS total FROM usuarios WHERE papel = 'ADMIN' AND ativo = 1");
  assert.equal(ativos.rows[0].total, 1);
});

test('duas edições da mesma versão aceitam somente uma atualização do modelo', async () => {
  const sufixo = `${Date.now()}_${process.pid}`;
  const marca = (await pool.query('INSERT INTO marcas (nome) VALUES ($1) RETURNING id', [`MARCA VERSAO ${sufixo}`])).rows[0];
  const setor = (await pool.query('INSERT INTO setores (nome, ativo) VALUES ($1, 1) RETURNING id', [`SETOR VERSAO ${sufixo}`])).rows[0];
  const modelo = (await pool.query(`
    INSERT INTO modelo (nome, id_marca_fk, id_setor_fk)
    VALUES ($1, $2, $3) RETURNING id, versao
  `, [`MODELO VERSAO ${sufixo}`, marca.id, setor.id])).rows[0];
  const categoria = (await pool.query(`
    INSERT INTO categorias (id_modelo, categoria) VALUES ($1, 'CATEGORIA') RETURNING id
  `, [modelo.id])).rows[0];
  await pool.query(`
    INSERT INTO perguntas (id_categoria, id_modelo, pergunta, identificacao, ativo)
    VALUES ($1, $2, 'ORIGINAL', 'categoria_1', 1)
  `, [categoria.id, modelo.id]);

  const respostas = await Promise.all(['ALTERAÇÃO A', 'ALTERAÇÃO B'].map(async (pergunta) => {
    const res = resposta();
    await cadastros.atualizarModelo({ params: { id: modelo.id }, body: {
      nomeModelo: `MODELO VERSAO ${sufixo}`,
      nomeMarca: marca.id,
      id_setor: setor.id,
      ativo: true,
      versao: modelo.versao,
      categorias: { CATEGORIA: { ctq: false, perguntas: [pergunta] } },
    } }, res);
    return res;
  }));

  assert.deepEqual(respostas.map(({ statusCode }) => statusCode).sort(), [200, 409]);
  const persistido = await pool.query('SELECT versao FROM modelo WHERE id = $1', [modelo.id]);
  assert.equal(persistido.rows[0].versao, 2);
});
