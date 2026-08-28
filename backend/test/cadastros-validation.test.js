const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const db = require('../db');
const cadastros = require('../controllers/CadastrosController');
const perfis = require('../controllers/PerfisController');
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
  db.connect = async () => ({
    async query(sql, params = []) {
      consultas.push({ sql, params });
      if (/FROM setores/.test(sql) || /^(BEGIN|COMMIT)$/.test(sql)) return { rows: [{ id: 2 }], rowCount: 1 };
      if (/UPDATE celulas_producao/.test(sql)) return { rows: [{ id: 1, ativo: params[3] }], rowCount: 1 };
      throw new Error(`consulta inesperada: ${sql}`);
    },
    release() {},
  });

  await cadastros.atualizarSetor({ params: { id: 1 }, body: { nome: 'Setor', ativo: true } }, resposta());
  await cadastros.atualizarUnidade({ params: { id: 1 }, body: { nome: 'Unidade', ativo: false } }, resposta());
  await cadastros.atualizarCelula({ params: { id: 1 }, body: { nome: 'Célula', id_setor_fk: 2, id_marca_fk: null, ativo: true } }, resposta());

  assert.equal(consultas[0].params[1], 1);
  assert.equal(consultas[1].params[1], 0);
  const atualizacao = consultas.find(({ sql }) => /UPDATE celulas_producao/.test(sql));
  assert.equal(atualizacao.params[3], 1);
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
      if (/SELECT id FROM setores/.test(sql)) return { rows: [{ id: 3 }], rowCount: 1 };
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
        if (/SELECT id FROM setores/.test(sql)) return { rows: [{ id: 3 }], rowCount: 1 };
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
      if (/SELECT id FROM setores/.test(sql)) return { rows: [{ id: 3 }], rowCount: 1 };
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
    body: { nomeModelo: 'Modelo', nomeMarca: 7, id_setor: 3, ativo: false, versao: 1, categorias: categoriasValidas },
  }, res);

  const update = consultas.find(({ sql }) => /UPDATE modelo SET/.test(sql));
  assert.equal(res.statusCode, 200);
  assert.match(update.sql, /id_marca_fk/);
  assert.deepEqual(update.params, ['Modelo', 7, false, 3, 9, 1]);
});

test('atualização preserva perguntas repetidas usando a identificação posicional', async () => {
  const consultas = [];
  let proximoId = 40;
  db.connect = async () => ({
    async query(sql, params = []) {
      consultas.push({ sql, params });
      if (/SELECT id FROM marcas/.test(sql)) return { rows: [{ id: 7 }], rowCount: 1 };
      if (/SELECT id FROM setores/.test(sql)) return { rows: [{ id: 3 }], rowCount: 1 };
      if (/UPDATE modelo SET/.test(sql)) return { rows: [], rowCount: 1 };
      if (/SELECT id FROM categorias/.test(sql)) return { rows: [{ id: 12 }], rowCount: 1 };
      if (/SELECT id FROM perguntas/.test(sql)) {
        return { rows: [{ id: proximoId++ }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    },
    release() {},
  });

  const res = resposta();
  await cadastros.atualizarModelo({
    params: { id: 9 },
    body: {
      nomeModelo: 'Modelo', nomeMarca: 7, id_setor: 3, ativo: true, versao: 1,
      categorias: { TESTE: { ctq: false, perguntas: ['Repetida', 'Repetida', 'Única'] } },
    },
  }, res);

  const buscas = consultas.filter(({ sql }) => /SELECT id FROM perguntas/.test(sql));
  const atualizacoes = consultas.filter(({ sql }) => /UPDATE perguntas SET pergunta =/.test(sql));
  assert.equal(res.statusCode, 200);
  assert.deepEqual(buscas.map(({ params }) => params), [
    [9, 'teste_1'], [9, 'teste_2'], [9, 'teste_3'],
  ]);
  assert.deepEqual(atualizacoes.map(({ params }) => params.slice(0, 3)), [
    ['Repetida', 12, 40], ['Repetida', 12, 41], ['Única', 12, 42],
  ]);
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
  assert.deepEqual(consulta.params, [7, 3]);
});

test('filtros de modelos rejeitam IDs inválidos antes do banco', async () => {
  let consultas = 0;
  db.query = async () => { consultas += 1; return { rows: [] }; };
  for (const query of [{ marca_id: 'abc' }, { setor_id: '0' }, { marca_id: ['7'] }]) {
    const res = resposta();
    await dados.listarModelosAtivos({ query }, res);
    assert.equal(res.statusCode, 400, JSON.stringify(query));
  }
  assert.equal(consultas, 0);
});

test('detalhe do modelo devolve o ID canônico da marca para edição', async () => {
  let chamada = 0;
  let consultaDetalhes;
  db.query = async (sql) => {
    chamada += 1;
    if (chamada === 1) return {
      rows: [{ id: 9, nome: 'Modelo', marca: 'LEGADO', id_marca_fk: 7, nome_marca: 'MARCA', ativo: true, id_setor_fk: 3, versao: 4 }],
    };
    consultaDetalhes = sql;
    return { rows: [{ categoria: 'COSTURA', ctq: false, pergunta: 'Pergunta' }] };
  };

  const res = resposta();
  await cadastros.buscarModeloPorId({ params: { id: 9 } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.modelo.nomeMarca, 7);
  assert.equal(res.body.modelo.nome_marca, 'MARCA');
  assert.equal(res.body.modelo.versao, 4);
  assert.match(consultaDetalhes, /JOIN perguntas p ON c\.id = p\.id_categoria AND p\.ativo = 1/);
  assert.doesNotMatch(consultaDetalhes, /LEFT JOIN perguntas/);
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

  const consultas = [];
  db.query = async (sql, params) => {
    consultas.push({ sql, params });
    return { rows: [], rowCount: 0 };
  };

  const resDuplicado = resposta();
  await cadastros.criarCategoriaPadrao({ body: { nome: 'Costura', ctq: true, perguntas: ['P1'] } }, resDuplicado);
  assert.equal(resDuplicado.statusCode, 409);
  assert.match(resDuplicado.body.mensagem, /Já existe uma categoria cadastrada/);
  assert.equal(consultas.length, 1);
  assert.match(consultas[0].sql, /INSERT INTO categorias_padrao/);
  assert.match(consultas[0].sql, /ON CONFLICT \(LOWER\(TRIM\(nome\)\)\) WHERE ativo = 1 DO NOTHING/i);
  assert.doesNotMatch(consultas[0].sql, /SELECT/i);
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

test('rejeita categorias cujos slugs colidem antes de escrever', async () => {
  let conexoes = 0;
  db.connect = async () => { conexoes += 1; throw new Error('não deveria conectar'); };
  const res = resposta();

  await cadastros.criarModelo({ body: {
    nomeModelo: 'Modelo', id_marca_fk: 7, id_setor: 3,
    categorias: {
      'A B': { ctq: false, perguntas: ['Primeira'] },
      A_B: { ctq: false, perguntas: ['Segunda'] },
    },
  } }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(conexoes, 0);
});

test('rejeita identificador de pergunta acima de 100 caracteres antes de escrever', async () => {
  let conexoes = 0;
  db.connect = async () => { conexoes += 1; throw new Error('não deveria conectar'); };
  const res = resposta();

  await cadastros.criarModelo({ body: {
    nomeModelo: 'Modelo', id_marca_fk: 7, id_setor: 3,
    categorias: { ['A'.repeat(100)]: { ctq: false, perguntas: ['Pergunta'] } },
  } }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(conexoes, 0);
});

test('rejeita ctq textual no catálogo sem escrever', async () => {
  let consultas = 0;
  db.query = async () => { consultas += 1; throw new Error('não deveria consultar'); };
  const res = resposta();

  await cadastros.criarCategoriaPadrao({ body: { nome: 'Teste', ctq: 'false', perguntas: ['P'] } }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(consultas, 0);
});

test('rejeita setor inexistente ou inativo ao criar modelo antes do insert', async () => {
  for (const setor of [{ id: 3, ativo: 0 }, null]) {
    const consultas = [];
    db.connect = async () => ({
      async query(sql, params = []) {
        consultas.push({ sql, params });
        if (/FROM marcas/.test(sql)) return { rows: [{ id: 7 }], rowCount: 1 };
        if (/FROM setores/.test(sql)) {
          assert.match(sql, /ativo\s*=\s*1/);
          return setor && !/ativo\s*=\s*1/.test(sql) ? { rows: [setor], rowCount: 1 } : { rows: [], rowCount: 0 };
        }
        if (/^(BEGIN|ROLLBACK|COMMIT)$/.test(sql)) return { rows: [], rowCount: 0 };
        throw new Error(`insert inesperado: ${sql}`);
      },
      release() {},
    });
    const res = resposta();

    await cadastros.criarModelo({ body: { nomeModelo: 'Modelo', id_marca_fk: 7, id_setor: 3, categorias: categoriasValidas } }, res);

    assert.equal(res.statusCode, 400);
    assert.equal(consultas.some(({ sql }) => /INSERT INTO/.test(sql)), false);
  }
});

test('rejeita célula com setor inativo ou marca inexistente antes do insert', async () => {
  for (const caso of [
    { setor: { id: 3, ativo: 0 }, marca: { id: 7 } },
    { setor: { id: 3, ativo: 1 }, marca: null },
  ]) {
    const consultas = [];
    const query = async (sql, params = []) => {
      consultas.push({ sql, params });
      if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(sql)) return { rows: [], rowCount: 0 };
      if (/FROM setores/.test(sql)) {
        assert.match(sql, /ativo\s*=\s*1/);
        return caso.setor.ativo === 1 ? { rows: [caso.setor], rowCount: 1 } : { rows: [], rowCount: 0 };
      }
      if (/FROM marcas/.test(sql)) {
        assert.doesNotMatch(sql, /ativo/);
        return caso.marca ? { rows: [caso.marca], rowCount: 1 } : { rows: [], rowCount: 0 };
      }
      throw new Error(`insert inesperado: ${sql}`);
    };
    db.query = query;
    db.connect = async () => ({ query, release() {} });
    const res = resposta();

    await cadastros.criarCelula({ body: { nome: 'Célula', id_setor_fk: 3, id_marca_fk: 7 } }, res);

    assert.equal(res.statusCode, 400);
    assert.equal(consultas.some(({ sql }) => /INSERT INTO/.test(sql)), false);
  }
});

test('rejeita setor inativo ou marca inexistente ao atualizar célula', async () => {
  for (const caso of [
    { setor: { id: 3, ativo: 0 }, marca: { id: 7 }, marcaId: 7 },
    { setor: { id: 3, ativo: 1 }, marca: null, marcaId: 7 },
  ]) {
    const consultas = [];
    const query = async (sql, params = []) => {
      consultas.push({ sql, params });
      if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(sql)) return { rows: [], rowCount: 0 };
      if (/FROM setores/.test(sql)) {
        assert.match(sql, /ativo\s*=\s*1/);
        return caso.setor.ativo === 1 ? { rows: [caso.setor], rowCount: 1 } : { rows: [], rowCount: 0 };
      }
      if (/FROM marcas/.test(sql)) {
        assert.doesNotMatch(sql, /ativo/);
        return caso.marca ? { rows: [caso.marca], rowCount: 1 } : { rows: [], rowCount: 0 };
      }
      throw new Error(`update inesperado: ${sql}`);
    };
    db.query = query;
    db.connect = async () => ({ query, release() {} });
    const res = resposta();

    await cadastros.atualizarCelula({ params: { id: 12 }, body: {
      nome: 'Célula', id_setor_fk: 3, id_marca_fk: caso.marcaId, ativo: true,
    } }, res);

    assert.equal(res.statusCode, 400);
    assert.equal(consultas.some(({ sql }) => /UPDATE celulas_producao/.test(sql)), false);
  }
});

test('rejeita perfil com FK de setor, célula ou turno inválida sem inserir', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({ status: 200, ok: true, async json() { return { data: { nome: 'Pessoa' } }; } });
  try {
    for (const caso of [
      { campo: 'id_unidade_fk', tabela: 'unidades', registro: null },
      { campo: 'id_setor_fk', tabela: 'setores', registro: { id: 99, ativo: 0 } },
      { campo: 'id_celula_fk', tabela: 'celulas_producao', registro: { id: 99, ativo: 0 } },
      { campo: 'id_turno_fk', tabela: 'turnos', registro: null },
    ]) {
    const { campo, tabela, registro } = caso;
    let inseriu = false;
    const consultas = [];
    const query = async (sql, params) => {
      consultas.push({ sql, params });
      if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(sql)) return { rows: [], rowCount: 0 };
      if (new RegExp(`FROM ${tabela}`).test(sql)) {
        if (!registro || /ativo\s*=\s*1/.test(sql)) return { rows: [], rowCount: 0 };
        return { rows: [registro], rowCount: 1 };
      }
      if (/INSERT INTO usuarios/.test(sql)) inseriu = true;
      return { rows: [{ id: 1 }], rowCount: 1 };
    };
    db.query = query;
    db.connect = async () => ({ query, release() {} });
    const res = resposta();

    await perfis.criar({ body: {
      matricula: '123', papel: 'INSPETOR', id_unidade_fk: null,
      id_setor_fk: null, id_celula_fk: null, id_turno_fk: null,
      [campo]: 99,
    } }, res);

    assert.equal(res.statusCode, 400);
    assert.equal(inseriu, false);
    const validacao = consultas.find(({ sql }) => new RegExp(`FROM ${tabela}`).test(sql));
    if (campo === 'id_unidade_fk' || campo === 'id_setor_fk' || campo === 'id_celula_fk') assert.match(validacao.sql, /ativo\s*=\s*1/);
    else assert.doesNotMatch(validacao.sql, /ativo/);
    }
  } finally {
    global.fetch = originalFetch;
  }
});

test('perfil aceita FKs nulas explicitamente e persiste null', async () => {
  const originalFetch = global.fetch;
  const consultas = [];
  global.fetch = async () => ({ status: 200, ok: true, async json() { return { data: { nome: 'Pessoa', funcao: 'Função' } }; } });
  const query = async (sql, params = []) => {
    consultas.push({ sql, params });
    if (/INSERT INTO usuarios/.test(sql)) return { rows: [{ id: 1, matricula: '123' }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  };
  db.query = query;
  db.connect = async () => ({ query, release() {} });

  try {
    const res = resposta();
    await perfis.criar({ body: {
      matricula: '123', papel: 'INSPETOR', id_unidade_fk: null,
      id_setor_fk: null, id_celula_fk: null, id_turno_fk: null,
    } }, res);
    const insert = consultas.find(({ sql }) => /INSERT INTO usuarios/.test(sql));
    assert.equal(res.statusCode, 201);
    assert.deepEqual(insert.params.slice(-4), [null, null, null, null]);
  } finally {
    global.fetch = originalFetch;
  }
});

test('criação e atualização de célula validam e escrevem no mesmo cliente transacional', async () => {
  for (const [acao, req] of [
    ['criarCelula', { body: { nome: 'Célula', id_setor_fk: 3, id_marca_fk: null } }],
    ['atualizarCelula', { params: { id: 8 }, body: { nome: 'Célula', id_setor_fk: 3, id_marca_fk: null, ativo: true } }],
  ]) {
    const consultas = [];
    let consultasNoPool = 0;
    db.query = async () => { consultasNoPool += 1; throw new Error('pool não deve executar validação ou escrita'); };
    db.connect = async () => ({ async query(sql, params = []) {
      consultas.push({ sql, params });
      if (/FROM setores/.test(sql)) return { rows: [{ id: 3 }], rowCount: 1 };
      if (/celulas_producao/.test(sql)) return { rows: [{ id: 8 }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    }, release() { consultas.push({ sql: 'release' }); } });

    const res = resposta();
    await cadastros[acao](req, res);

    assert.equal(res.statusCode, acao === 'criarCelula' ? 201 : 200);
    assert.equal(consultasNoPool, 0);
    assert.equal(consultas[0].sql, 'BEGIN');
    assert.match(consultas[1].sql, /FROM setores/);
    assert.match(consultas[2].sql, /celulas_producao/);
    assert.equal(consultas.at(-2).sql, 'COMMIT');
    assert.equal(consultas.at(-1).sql, 'release');
  }
});

test('criação e atualização de perfil validam e escrevem no mesmo cliente transacional', async () => {
  const originalFetch = global.fetch;
  try {
    for (const [acao, req] of [
      ['criar', { body: { matricula: '123', papel: 'INSPETOR', id_unidade_fk: 1, id_setor_fk: null, id_celula_fk: null, id_turno_fk: null } }],
      ['atualizar', { params: { id: 4 }, body: { papel: 'INSPETOR', ativo: true, id_unidade_fk: 1, id_setor_fk: null, id_celula_fk: null, id_turno_fk: null } }],
    ]) {
      const eventos = [];
      let consultasNoPool = 0;
      global.fetch = async () => { eventos.push('fetch'); return { status: 200, ok: true, async json() { return { data: { nome: 'Pessoa', funcao: 'Função' } }; } }; };
      db.query = async () => { consultasNoPool += 1; throw new Error('pool não deve executar validação ou escrita'); };
      db.connect = async () => ({ async query(sql, params = []) {
        eventos.push(sql);
        if (/FROM unidades/.test(sql)) return { rows: [{ id: 1 }], rowCount: 1 };
        if (/usuarios/.test(sql)) return { rows: [{ id: 4 }], rowCount: 1 };
        return { rows: [], rowCount: 0 };
      }, release() { eventos.push('release'); } });

      const res = resposta();
      await perfis[acao](req, res);

      assert.equal(res.statusCode, acao === 'criar' ? 201 : 200);
      assert.equal(consultasNoPool, 0);
      if (acao === 'criar') assert.equal(eventos[0], 'fetch');
      assert.equal(eventos[eventos.indexOf('BEGIN') + 1].includes('FROM unidades'), true);
      assert.equal(eventos.at(-2), 'COMMIT');
      assert.equal(eventos.at(-1), 'release');
    }
  } finally {
    global.fetch = originalFetch;
  }
});

test('não permite remover o último administrador ativo', async () => {
  const consultas = [];
  db.connect = async () => ({
    async query(sql, params = []) {
      consultas.push({ sql, params });
      if (/SELECT pg_advisory_xact_lock/.test(sql)) return { rows: [] };
      if (/SELECT id, papel, ativo FROM usuarios/.test(sql)) return { rows: [{ id: 4, papel: 'ADMIN', ativo: 1 }] };
      if (/SELECT COUNT\(\*\)/.test(sql)) return { rows: [{ total: 1 }] };
      return { rows: [], rowCount: 0 };
    },
    release() {},
  });

  const res = resposta();
  await perfis.atualizar({ params: { id: 4 }, body: {
    papel: 'INSPETOR', ativo: false,
    id_unidade_fk: null, id_setor_fk: null, id_celula_fk: null, id_turno_fk: null,
  } }, res);

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.codigo, 'ULTIMO_ADMIN');
  assert.equal(consultas.some(({ sql }) => /^\s*UPDATE usuarios/.test(sql)), false);
  assert.equal(consultas.some(({ sql }) => sql === 'ROLLBACK'), true);
});

test('permite rebaixar administrador quando outro administrador permanece ativo', async () => {
  const consultas = [];
  db.connect = async () => ({
    async query(sql, params = []) {
      consultas.push({ sql, params });
      if (/SELECT pg_advisory_xact_lock/.test(sql)) return { rows: [] };
      if (/SELECT id, papel, ativo FROM usuarios/.test(sql)) return { rows: [{ id: 4, papel: 'ADMIN', ativo: 1 }] };
      if (/SELECT COUNT\(\*\)/.test(sql)) return { rows: [{ total: 2 }] };
      if (/UPDATE usuarios/.test(sql)) return { rows: [{ id: 4, papel: 'INSPETOR', ativo: 0 }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    },
    release() {},
  });

  const res = resposta();
  await perfis.atualizar({ params: { id: 4 }, body: {
    papel: 'INSPETOR', ativo: false,
    id_unidade_fk: null, id_setor_fk: null, id_celula_fk: null, id_turno_fk: null,
  } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.perfil.papel, 'INSPETOR');
});

test('modelo exige versão e retorna conflito quando a versão está obsoleta', async () => {
  let conexoes = 0;
  db.connect = async () => {
    conexoes += 1;
    throw new Error('não deveria conectar sem versão');
  };
  const semVersao = resposta();
  await cadastros.atualizarModelo({ params: { id: 9 }, body: {
    nomeModelo: 'Modelo', nomeMarca: 7, id_setor: 3, ativo: true, categorias: categoriasValidas,
  } }, semVersao);
  assert.equal(semVersao.statusCode, 400);
  assert.equal(conexoes, 0);

  const consultas = [];
  db.connect = async () => ({
    async query(sql, params = []) {
      consultas.push({ sql, params });
      if (/SELECT id FROM marcas/.test(sql)) return { rows: [{ id: 7 }] };
      if (/SELECT id FROM setores/.test(sql)) return { rows: [{ id: 3 }] };
      if (/UPDATE modelo SET/.test(sql)) return { rows: [], rowCount: 0 };
      if (/SELECT id FROM modelo/.test(sql)) return { rows: [{ id: 9 }] };
      return { rows: [], rowCount: 0 };
    },
    release() {},
  });
  const conflito = resposta();
  await cadastros.atualizarModelo({ params: { id: 9 }, body: {
    nomeModelo: 'Modelo', nomeMarca: 7, id_setor: 3, ativo: true, versao: 1, categorias: categoriasValidas,
  } }, conflito);
  assert.equal(conflito.statusCode, 409);
  assert.equal(conflito.body.codigo, 'MODELO_ALTERADO_CONCORRENTEMENTE');
  assert.match(consultas.find(({ sql }) => /UPDATE modelo SET/.test(sql)).sql, /AND versao = \$6/);
});

test('atualização concorrente de categoria padrão retorna 409 para conflito único', async () => {
  db.query = async (sql) => {
    if (/SELECT id FROM categorias_padrao/.test(sql)) return { rows: [], rowCount: 0 };
    if (/UPDATE categorias_padrao/.test(sql)) {
      const error = new Error('duplicada');
      error.code = '23505';
      throw error;
    }
    throw new Error(`consulta inesperada: ${sql}`);
  };
  const res = resposta();

  await cadastros.atualizarCategoriaPadrao({ params: { id: 5 }, body: { nome: 'Acabamento', ctq: false, perguntas: [] } }, res);

  assert.equal(res.statusCode, 409);
});
