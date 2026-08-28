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

test('rejeita filtros de ID, datas e valores não escalares antes do banco', async () => {
  let consultas = 0;
  db.query = async () => { consultas += 1; return { rows: [] }; };
  for (const query of [
    { modeloId: 'abc' },
    { setorId: '0' },
    { celulaId: '-1' },
    { dataInicio: '2026-02-30' },
    { dataFim: '2026-1-01' },
    { dataInicio: '2026-08-29', dataFim: '2026-08-28' },
    { busca: ['texto'] },
    { usuario: { nome: 'Pessoa' } },
  ]) {
    const res = resposta();
    await submissoes.listarSubmissoes({ query }, res);
    assert.equal(res.statusCode, 400, JSON.stringify(query));
  }
  assert.equal(consultas, 0);
});

test('detalhe preserva MIME da assinatura e usa PNG para registros legados', async () => {
  const base = {
    id: 1,
    data_envio: '2026-08-27T00:00:00Z',
    respostas: [{ id_pergunta: 1, resposta: 'Conforme' }],
    snapshot: { modelo: { nome: 'Modelo' }, perguntas: [{ id: 1, pergunta: 'Pergunta', categoria: 'Categoria' }] },
    id_modelo: 1,
    nome_usuario: 'Pessoa', nome_modelo: 'Modelo', nome_celula: 'Célula',
  };
  db.query = async () => ({ rows: [{ ...base, assinatura: Buffer.from('webp'), assinatura_mime: 'image/webp' }] });
  const preservada = resposta();
  await submissoes.buscarDetalhesSubmissao({ params: { id: '1' } }, preservada);
  assert.match(preservada.body.dados.assinatura, /^data:image\/webp;base64,/);

  db.query = async () => ({ rows: [{ ...base, assinatura: Buffer.from('png'), assinatura_mime: null }] });
  const legada = resposta();
  await submissoes.buscarDetalhesSubmissao({ params: { id: '1' } }, legada);
  assert.match(legada.body.dados.assinatura, /^data:image\/png;base64,/);
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
  assert.match(sql, /snapshot -> 'marca' ->> 'nome'/);
  assert.match(sql, /ma\.nome, m\.marca\) = \$1/);
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
  assert.match(sqlHistorico, /snapshot -> 'setor' ->> 'nome'/);
  assert.match(sqlHistorico, /st_sub\.nome, st_cp\.nome, st_user\.nome,/);
  assert.doesNotMatch(sqlHistorico, /st_mod/);
  assert.match(sqlRelatorio, /LEFT JOIN setores st_sub ON s\.id_setor = st_sub\.id/);
  assert.match(sqlRelatorio, /snapshot -> 'setor' ->> 'nome'/);
  assert.match(sqlRelatorio, /st_sub\.nome, st_cp\.nome, st_user\.nome\) AS nome_setor/);
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

test('detalhe usa snapshot v2 e retorna somente metadados das evidências', async () => {
  const submissao = {
    id: 7,
    data_envio: '2026-08-27T00:00:00Z',
    inicio_checklist: '2026-08-27T00:00:00Z',
    assinatura: null,
    respostas: [{ id_pergunta: 1, resposta: 'Não Conforme', observacao: 'Falha' }],
    snapshot: {
      schema: 2,
      modelo: { id: 2, nome: 'Modelo congelado', marca: 'FILA', versao: 4 },
      setor: { id: 3, nome: 'Setor congelado' },
      celula: { id: 4, nome: 'Célula congelada' },
      auditor: { id: 5, nome: 'Auditor congelado', matricula: 'A-5' },
      unidade: { id: 6, nome: 'Unidade congelada' },
      perguntas: [{ id: 1, pergunta: 'Pergunta congelada', categoria: 'Categoria' }],
      evidencias: { total: 1 },
    },
    id_modelo: 2,
    nome_usuario: 'Nome vivo alterado',
    nome_modelo: 'Modelo vivo alterado',
    nome_celula: 'Célula viva alterada',
    nome_setor: 'Setor vivo alterado',
  };
  db.query = async (sql) => {
    if (/FROM formulario_evidencias/.test(sql)) return { rows: [{
      id_evidencia: 11, id_pergunta: 1, mime: 'image/jpeg', tamanho: 1234,
      criada_em: '2026-08-27T00:00:00Z', expira_em: '2027-02-27T00:00:00Z',
      removida_em: null, disponivel: true,
    }] };
    if (/FROM formulario_submissoes s/.test(sql)) return { rows: [submissao] };
    throw new Error(`consulta inesperada: ${sql}`);
  };
  const res = resposta();

  await submissoes.buscarDetalhesSubmissao({ params: { id: '7' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.dados.nomeModelo, 'Modelo congelado');
  assert.equal(res.body.dados.nomeUsuario, 'Auditor congelado');
  assert.equal(res.body.dados.nomeSetor, 'Setor congelado');
  assert.equal(res.body.dados.nomeCelula, 'Célula congelada');
  assert.equal(res.body.dados.unidade, 'Unidade congelada');
  assert.equal(res.body.dados.evidencias.total, 1);
  assert.deepEqual(res.body.dados.evidencias.itens[0], {
    id: 11, idPergunta: 1, mime: 'image/jpeg', tamanho: 1234,
    criadaEm: '2026-08-27T00:00:00Z', expiraEm: '2027-02-27T00:00:00Z',
    removidaEm: null, disponivel: true, legado: false, pergunta: 'Pergunta congelada',
  });
  assert.equal(Object.hasOwn(res.body.dados.categorias.Categoria[0], 'foto'), false);
  assert.deepEqual(res.body.dados.categorias.Categoria[0].evidencia, { id: 11, disponivel: true });
});

test('conteúdo de evidência respeita vínculo com a submissão e expiração', async () => {
  const conteudo = Buffer.from('imagem');
  const criarRespostaBinaria = () => ({
    statusCode: 200,
    body: null,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    set(headers) { this.headers = headers; return this; },
    send(body) { this.body = body; return this; },
  });

  db.query = async (sql, params) => {
    assert.match(sql, /WHERE id = \$1 AND id_submissao = \$2/);
    assert.deepEqual(params, [11, 7]);
    return { rows: [{ mime: 'image/jpeg', tamanho: conteudo.length, conteudo, expira_em: '2999-01-01T00:00:00Z', removida_em: null, disponivel: true }] };
  };
  const disponivel = criarRespostaBinaria();
  await submissoes.baixarEvidenciaSubmissao({ params: { id: '7', evidenciaId: '11' } }, disponivel);
  assert.equal(disponivel.statusCode, 200);
  assert.equal(disponivel.headers['Content-Type'], 'image/jpeg');
  assert.deepEqual(disponivel.body, conteudo);

  db.query = async () => ({ rows: [{ mime: 'image/jpeg', tamanho: conteudo.length, conteudo, expira_em: '2020-01-01T00:00:00Z', removida_em: null, disponivel: false }] });
  const expirada = criarRespostaBinaria();
  await submissoes.baixarEvidenciaSubmissao({ params: { id: '7', evidenciaId: '11' } }, expirada);
  assert.equal(expirada.statusCode, 410);
  assert.equal(expirada.body.codigo, 'EVIDENCIA_EXPIRADA');
});

test('rejeita ID numérico de evidência fora do limite antes do banco', async () => {
  let consultas = 0;
  db.query = async () => { consultas += 1; return { rows: [] }; };
  const res = resposta();

  await submissoes.baixarEvidenciaSubmissao({ params: { id: '7', evidenciaId: '2147483648' } }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(consultas, 0);
});
