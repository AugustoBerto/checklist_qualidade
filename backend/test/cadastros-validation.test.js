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
  headers: {},
  status(code) { this.statusCode = code; return this; },
  set(headers) { Object.assign(this.headers, headers); return this; },
  send(body) { this.body = body; return this; },
  json(body) { this.body = body; return this; },
});

const categoriasValidas = {
  COSTURA: { ctq: false, perguntas: ['A costura está íntegra?'] },
};

const pngUmPixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';

test('marca persiste logo PNG válida e rejeita conteúdo que não corresponde ao MIME', async () => {
  let insert;
  db.query = async (sql, params) => {
    insert = { sql, params };
    return { rows: [{ id: 4, nome: 'FILA', tem_logo: true }], rowCount: 1 };
  };

  const resValida = resposta();
  await cadastros.criarMarca({ body: { nome: 'Fila', logo: pngUmPixel } }, resValida);
  assert.equal(resValida.statusCode, 201);
  assert.match(insert.sql, /logo_mime/);
  assert.equal(insert.params[0], 'FILA');
  assert.ok(Buffer.isBuffer(insert.params[1]));
  assert.equal(insert.params[2], 'image/png');

  const resInvalida = resposta();
  await cadastros.criarMarca({ body: { nome: 'Falsa', logo: 'data:image/png;base64,ZmFsc2E=' } }, resInvalida);
  assert.equal(resInvalida.statusCode, 400);
});

test('endpoint da logo devolve bytes e cache, ou 404 quando não existe', async () => {
  db.query = async (_sql, params) => params[0] === '4'
    ? { rows: [{ logo: Buffer.from('imagem'), logo_mime: 'image/webp', ultimaAlteracao: new Date('2026-08-27T00:00:00Z') }] }
    : { rows: [] };

  const encontrada = resposta();
  await cadastros.buscarLogoMarca({ params: { id: '4' } }, encontrada);
  assert.equal(encontrada.statusCode, 200);
  assert.equal(encontrada.headers['Content-Type'], 'image/webp');
  assert.equal(encontrada.headers['Cache-Control'], 'public, max-age=3600');
  assert.deepEqual(encontrada.body, Buffer.from('imagem'));

  const ausente = resposta();
  await cadastros.buscarLogoMarca({ params: { id: '5' } }, ausente);
  assert.equal(ausente.statusCode, 404);
});

test('edição preserva logo omitida e remove logo enviada como null', async () => {
  const consultas = [];
  db.query = async (sql, params) => {
    consultas.push({ sql, params });
    return { rows: [{ id: 4, nome: 'FILA' }], rowCount: 1 };
  };

  await cadastros.atualizarMarca({ params: { id: 4 }, body: { nome: 'Fila' } }, resposta());
  await cadastros.atualizarMarca({ params: { id: 4 }, body: { nome: 'Fila', logo: null } }, resposta());

  assert.doesNotMatch(consultas[0].sql, /logo\s*=/);
  assert.match(consultas[1].sql, /logo\s*=\s*NULL/);
});

test('atualizações convertem status booleano para colunas integer', async () => {
  const consultas = [];
  db.query = async (sql, params) => {
    consultas.push({ sql, params });
    return { rows: [{ id: 1, ativo: params.at(-2) }], rowCount: 1 };
  };

  await cadastros.atualizarSetor({ params: { id: 1 }, body: { nome: 'Setor', ativo: true } }, resposta());
  await cadastros.atualizarUnidade({ params: { id: 1 }, body: { nome: 'Unidade', ativo: false } }, resposta());
  await cadastros.atualizarCelula({ params: { id: 1 }, body: { nome: 'Célula', id_setor_fk: 2, id_marca_fk: null, ativo: true } }, resposta());

  assert.equal(consultas[0].params[1], 1);
  assert.equal(consultas[1].params[1], 0);
  assert.equal(consultas[2].params[3], 1);
});

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
  assert.deepEqual(res.body.dados, []);
  assert.equal('modelos' in res.body, false);
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

test('criação de categoria padrão valida nome e recusa duplicatas com 409', async () => {
  const resSemNome = resposta();
  await cadastros.criarCategoriaPadrao({ body: { nome: '   ' } }, resSemNome);
  assert.equal(resSemNome.statusCode, 400);

  db.query = async (sql) => {
    if (/SELECT id FROM categorias_padrao/.test(sql)) {
      return { rows: [{ id: 1 }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  };

  const resDuplicado = resposta();
  await cadastros.criarCategoriaPadrao({ body: { nome: 'Costura', ctq: true, perguntas: ['P1'] } }, resDuplicado);
  assert.equal(resDuplicado.statusCode, 409);
  assert.match(resDuplicado.body.mensagem, /Já existe uma categoria cadastrada/);
});

test('atualização de categoria padrão persiste dados e exclusão inativa registro', async () => {
  let updateExecutado = false;
  let inativacaoExecutada = false;

  db.query = async (sql, params) => {
    if (/SELECT id FROM categorias_padrao/.test(sql)) {
      return { rows: [], rowCount: 0 };
    }
    if (/UPDATE categorias_padrao\s+SET nome =/i.test(sql)) {
      updateExecutado = true;
      return { rows: [{ id: 5, nome: params[0], ctq: params[1], perguntas: JSON.parse(params[2]) }], rowCount: 1 };
    }
    if (/UPDATE categorias_padrao\s+SET ativo = 0/i.test(sql)) {
      inativacaoExecutada = true;
      return { rows: [{ id: 5 }], rowCount: 1 };
    }
    return { rows: [] };
  };

  const resUpdate = resposta();
  await cadastros.atualizarCategoriaPadrao({ params: { id: 5 }, body: { nome: 'Acabamento', ctq: false, perguntas: ['Item 1'] } }, resUpdate);
  assert.equal(resUpdate.statusCode, 200);
  assert.equal(updateExecutado, true);

  const resDelete = resposta();
  await cadastros.excluirCategoriaPadrao({ params: { id: 5 } }, resDelete);
  assert.equal(resDelete.statusCode, 200);
  assert.equal(inativacaoExecutada, true);
});
