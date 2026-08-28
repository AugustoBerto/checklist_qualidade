const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const db = require('../db');
const checklist = require('../controllers/ChecklistController');
const relatorios = require('../controllers/RelatoriosController');
const submissoes = require('../controllers/SubmissoesController');

const originalQuery = db.query;

afterEach(() => {
  db.query = originalQuery;
});

const resposta = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test('limita página solicitada ao teto de 10000', async () => {
  const consultas = [];
  db.query = async (sql, params) => {
    consultas.push({ sql, params });
    return /count\(\*\)/.test(sql) ? { rows: [{ count: '0' }] } : { rows: [] };
  };
  const res = resposta();

  await submissoes.listarSubmissoes({ query: { page: '2147483647', pageSize: '100' } }, res);

  const consultaPaginada = consultas.find(({ sql }) => /LIMIT/.test(sql));
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.paginacao.page, 10000);
  assert.equal(consultaPaginada.params.at(-1), 999900);
});

test('filtro de marca usa nome da FK canônica e mantém texto somente como fallback legado', async () => {
  const consultas = [];
  db.query = async (sql, params) => {
    consultas.push({ sql, params });
    return /count\(\*\)/.test(sql) ? { rows: [{ count: '0' }] } : { rows: [] };
  };

  await submissoes.listarSubmissoes({ query: { marca: 'UMBRO' } }, resposta());

  const sql = consultas[0].sql;
  assert.match(sql, /LEFT JOIN marcas ma ON ma\.id = m\.id_marca_fk/);
  assert.match(sql, /COALESCE\(ma\.nome, m\.marca\) = \$1/);
  assert.deepEqual(consultas[0].params, ['UMBRO']);
});

test('histórico e relatório resolvem setor pela submissão', async () => {
  const consultas = [];
  db.query = async (sql, params) => {
    consultas.push({ sql, params });
    if (/count\(\*\)/.test(sql)) return { rows: [{ count: '0' }] };
    if (/FROM formulario_submissoes s/.test(sql) && /s\.respostas/.test(sql)) return { rows: [] };
    return { rows: [] };
  };

  await submissoes.listarSubmissoes({ query: {} }, resposta());
  await relatorios.buscarRelatorioPorId({ params: { id: '1' } }, resposta());

  const sqlHistorico = consultas.find(({ sql }) => /ORDER BY s\.data_envio/.test(sql)).sql;
  const sqlRelatorio = consultas.find(({ sql }) => /s\.respostas/.test(sql)).sql;
  assert.match(sqlHistorico, /LEFT JOIN setores st_sub ON s\.id_setor = st_sub\.id/);
  assert.match(sqlHistorico, /COALESCE\(st_sub\.nome, st_cp\.nome, st_user\.nome,/);
  assert.doesNotMatch(sqlHistorico, /st_mod/);
  assert.match(sqlRelatorio, /LEFT JOIN setores st_sub ON s\.id_setor = st_sub\.id/);
  assert.match(sqlRelatorio, /COALESCE\(st_sub\.nome, st_cp\.nome, st_user\.nome\) AS nome_setor/);
});

test('rejeita ID de relatório não decimal ou não positivo antes do banco', async () => {
  let consultas = 0;
  db.query = async () => { consultas += 1; return { rows: [] }; };

  for (const id of ['1abc', '0', '-1', '']) {
    const res = resposta();
    await relatorios.buscarRelatorioPorId({ params: { id } }, res);
    assert.equal(res.statusCode, 400, id);
  }

  assert.equal(consultas, 0);
});

test('agrupa categoria com nome reservado sem herdar Object.prototype', async () => {
  db.query = async () => ({
    rows: [{
      id_pergunta: 1,
      id_categoria: 1,
      categoria: '__proto__',
      ctq: false,
      pergunta: 'Pergunta',
      identificacao: 'pergunta',
      nome_modelo: 'Modelo',
      id_modelo_fk: 1,
    }],
  });
  const res = resposta();

  await checklist.buscarPerguntas({ params: { modelo: '1' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(Object.getPrototypeOf(res.body.respostasAgrupadas), null);
  assert.equal(res.body.respostasAgrupadas.__proto__[0].id, 1);
});

test('detalhes e gráfico aceitam categorias com nomes reservados', async () => {
  const submissao = {
    id: 1,
    data_envio: '2026-08-27T00:00:00Z',
    assinatura: null,
    respostas: [{ id_pergunta: 1, resposta: 'Conforme' }],
    snapshot: {
      modelo: { nome: 'Modelo' },
      perguntas: [{ id: 1, pergunta: 'Pergunta', categoria: '__proto__' }],
    },
    id_modelo: 1,
    nome_usuario: 'Pessoa',
    nome_modelo: 'Modelo',
    nome_celula: 'Célula',
    nome_setor: 'Setor',
  };
  db.query = async (sql) => {
    if (/FROM formulario_submissoes s/.test(sql)) return { rows: [submissao] };
    throw new Error(`consulta inesperada: ${sql}`);
  };
  const detalhesRes = resposta();
  const relatorioRes = resposta();

  await submissoes.buscarDetalhesSubmissao({ params: { id: '1' } }, detalhesRes);
  await relatorios.buscarRelatorioPorId({ params: { id: '1' } }, relatorioRes);

  assert.equal(detalhesRes.statusCode, 200);
  assert.equal(Object.getPrototypeOf(detalhesRes.body.dados.categorias), null);
  assert.equal(detalhesRes.body.dados.categorias.__proto__[0].pergunta, 'Pergunta');
  assert.equal(relatorioRes.statusCode, 200);
  assert.deepEqual(relatorioRes.body.dadosGrafico[1], ['Conforme', 1, '#67C23A']);
});
