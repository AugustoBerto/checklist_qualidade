const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const db = require('../db');
const cadastros = require('../controllers/CadastrosController');
const dados = require('../controllers/DadosController');

const originalConnect = db.connect;
const originalQuery = db.query;

afterEach(() => {
  db.connect = originalConnect;
  db.query = originalQuery;
});

const resposta = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const categoriasValidas = {
  COSTURA: { ctq: false, perguntas: ['A costura está íntegra?'] },
};

test('criação e atualização rejeitam a mesma estrutura inválida antes de acessar o banco', async () => {
  let conexoes = 0;
  db.connect = async () => {
    conexoes += 1;
    throw new Error('o banco não deve ser acessado para entrada inválida');
  };

  const casosInvalidos = [
    null,
    {},
    { '': { perguntas: ['Pergunta'] } },
    { COSTURA: { perguntas: 'Pergunta' } },
    { COSTURA: { perguntas: [] } },
    { COSTURA: { perguntas: ['  '] } },
  ];

  for (const categorias of casosInvalidos) {
    const body = { nomeModelo: 'Modelo', nomeMarca: 7, id_setor: 3, ativo: true, categorias };
    const resCriacao = resposta();
    const resAtualizacao = resposta();

    await assert.doesNotReject(() => cadastros.criarModelo({ body }, resCriacao));
    await assert.doesNotReject(() => cadastros.atualizarModelo({ params: { id: 9 }, body }, resAtualizacao));
    assert.equal(resCriacao.statusCode, 400);
    assert.equal(resAtualizacao.statusCode, 400);
  }

  assert.equal(conexoes, 0);
});

test('criação grava a marca canônica em id_marca_fk', async () => {
  const consultas = [];
  db.connect = async () => ({
    async query(sql, params = []) {
      consultas.push({ sql, params });
      if (/SELECT id FROM marcas/.test(sql)) return { rows: [{ id: 7 }], rowCount: 1 };
      if (/INSERT INTO modelo/.test(sql)) return { rows: [{ id: 11 }], rowCount: 1 };
      if (/INSERT INTO categorias/.test(sql)) return { rows: [{ id: 12 }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    },
    release() {},
  });

  const res = resposta();
  await cadastros.criarModelo({ body: { nomeModelo: ' Modelo ', id_marca_fk: 7, id_setor: 3, categorias: categoriasValidas } }, res);

  const insert = consultas.find(({ sql }) => /INSERT INTO modelo/.test(sql));
  assert.equal(res.statusCode, 201);
  assert.match(insert.sql, /id_marca_fk/);
  assert.deepEqual(insert.params, ['Modelo', 7, 3]);
  assert.ok(consultas.some(({ sql, params }) => /SELECT id FROM marcas/.test(sql) && params[0] === 7));
});

test('criação e atualização rejeitam marca que não seja um ID positivo', async () => {
  let conexoes = 0;
  db.connect = async () => { conexoes += 1; throw new Error('não deveria conectar'); };
  const body = { nomeModelo: 'Modelo', nomeMarca: 'MARCA TEXTO', id_setor: 3, ativo: true, categorias: categoriasValidas };
  const resCriacao = resposta();
  const resAtualizacao = resposta();

  await assert.doesNotReject(() => cadastros.criarModelo({ body }, resCriacao));
  await assert.doesNotReject(() => cadastros.atualizarModelo({ params: { id: 9 }, body }, resAtualizacao));

  assert.equal(resCriacao.statusCode, 400);
  assert.equal(resAtualizacao.statusCode, 400);
  assert.equal(conexoes, 0);
});

test('atualização grava a marca canônica e exige ativo booleano', async () => {
  let conexoes = 0;
  db.connect = async () => {
    conexoes += 1;
    return {
      async query(sql, params = []) {
        if (/SELECT id FROM marcas/.test(sql)) return { rows: [{ id: 7 }], rowCount: 1 };
        if (/UPDATE modelo SET/.test(sql)) return { rows: [], rowCount: 1, sql, params };
        if (/SELECT id FROM categorias/.test(sql)) return { rows: [] };
        if (/INSERT INTO categorias/.test(sql)) return { rows: [{ id: 12 }], rowCount: 1 };
        if (/SELECT id FROM perguntas/.test(sql)) return { rows: [] };
        if (/INSERT INTO perguntas/.test(sql)) return { rows: [{ id: 13 }], rowCount: 1 };
        return { rows: [], rowCount: 1 };
      },
      release() {},
    };
  };

  const semAtivo = resposta();
  await cadastros.atualizarModelo({
    params: { id: 9 },
    body: { nomeModelo: 'Modelo', nomeMarca: 7, id_setor: 3, categorias: categoriasValidas },
  }, semAtivo);
  assert.equal(semAtivo.statusCode, 400);
  assert.equal(conexoes, 0);

  const consultas = [];
  db.connect = async () => ({
    async query(sql, params = []) {
      consultas.push({ sql, params });
      if (/SELECT id FROM marcas/.test(sql)) return { rows: [{ id: 7 }], rowCount: 1 };
      if (/UPDATE modelo SET/.test(sql)) return { rows: [], rowCount: 1 };
      if (/SELECT id FROM categorias/.test(sql)) return { rows: [] };
      if (/INSERT INTO categorias/.test(sql)) return { rows: [{ id: 12 }], rowCount: 1 };
      if (/SELECT id FROM perguntas/.test(sql)) return { rows: [] };
      if (/INSERT INTO perguntas/.test(sql)) return { rows: [{ id: 13 }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    },
    release() {},
  });

  const res = resposta();
  await cadastros.atualizarModelo({
    params: { id: 9 },
    body: { nomeModelo: 'Modelo', nomeMarca: 7, id_setor: 3, ativo: false, categorias: categoriasValidas },
  }, res);

  const update = consultas.find(({ sql }) => /UPDATE modelo SET/.test(sql));
  assert.equal(res.statusCode, 200);
  assert.match(update.sql, /id_marca_fk/);
  assert.deepEqual(update.params, ['Modelo', 7, false, 3, 9]);
});

test('filtro de modelos por marca usa id_marca_fk', async () => {
  let consulta;
  db.query = async (sql, params) => {
    consulta = { sql, params };
    return { rows: [] };
  };

  const res = resposta();
  await dados.listarModelosAtivos({ query: { marca_id: '7', setor_id: '3' } }, res);

  assert.equal(res.statusCode, 200);
  assert.match(consulta.sql, /id_marca_fk = \$1/);
  assert.doesNotMatch(consulta.sql, /\bmarca = \$1/);
  assert.deepEqual(consulta.params, ['7', '3']);
});

test('detalhe do modelo devolve o ID canônico da marca para edição', async () => {
  let chamada = 0;
  db.query = async () => {
    chamada += 1;
    if (chamada === 1) return {
      rows: [{ id: 9, nome: 'Modelo', marca: 'LEGADO', id_marca_fk: 7, nome_marca: 'MARCA', ativo: true, id_setor_fk: 3 }],
    };
    return { rows: [{ categoria: 'COSTURA', ctq: false, pergunta: 'Pergunta' }] };
  };

  const res = resposta();
  await cadastros.buscarModeloPorId({ params: { id: 9 } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.modelo.nomeMarca, 7);
  assert.equal(res.body.modelo.nome_marca, 'MARCA');
});

test('listagem preserva marca como ID ou texto legado e expõe o nome separadamente', async () => {
  let consulta;
  db.query = async (sql) => {
    consulta = sql;
    return { rows: [] };
  };

  const res = resposta();
  await cadastros.listarModelos({}, res);

  assert.equal(res.statusCode, 200);
  assert.match(consulta, /COALESCE\(m\.id_marca_fk::text, m\.marca\) AS marca/);
  assert.match(consulta, /ma\.nome AS nome_marca/);
});
