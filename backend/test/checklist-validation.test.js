const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../db');
const checklist = require('../controllers/ChecklistController');
const { _internals } = checklist;

const imagem = `data:image/png;base64,${Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]).toString('base64')}`;
const imagemJpeg = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0x00]).toString('base64')}`;
const perguntas = [{ id: 1 }, { id: 2 }];
const connectOriginal = db.connect;
const queryOriginal = db.query;

test.afterEach(() => {
    db.connect = connectOriginal;
    db.query = queryOriginal;
});

const resposta = () => ({
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
});

const submissaoValida = () => ({
    usuario: { id: 99 },
    body: {
        id_modelo: 10,
        id_setor: 20,
        id_celula: 30,
        assinatura: imagem,
        respostas: [{ id_pergunta: 1, resposta: 'Conforme' }],
        inicio_checklist: '2026-08-26T10:00:00.000Z',
    },
});

test('aceita respostas completas, com ou sem foto no item não conforme', () => {
    assert.doesNotThrow(() => _internals.validarRespostas([
        { id_pergunta: 1, resposta: 'Conforme' },
        { id_pergunta: 2, resposta: 'Não Conforme', foto: imagem, observacao: 'Falha encontrada' },
    ], perguntas));

    assert.doesNotThrow(() => _internals.validarRespostas([
        { id_pergunta: 1, resposta: 'Conforme' },
        { id_pergunta: 2, resposta: 'Não Conforme', foto: null, observacao: 'Falha sem foto' },
    ], perguntas));
});

test('rejeita pergunta duplicada, enum inválido e não conformidade sem observação', () => {
    assert.throws(() => _internals.validarRespostas([{ id_pergunta: 1, resposta: 'Conforme' }, { id_pergunta: 1, resposta: 'N/A' }], perguntas));
    assert.throws(() => _internals.validarRespostas([{ id_pergunta: 1, resposta: 'Outra' }, { id_pergunta: 2, resposta: 'N/A' }], perguntas));
    assert.throws(() => _internals.validarRespostas([{ id_pergunta: 1, resposta: 'Conforme' }, { id_pergunta: 2, resposta: 'Não Conforme', observacao: '' }], perguntas));
    assert.throws(() => _internals.validarRespostas([{ id_pergunta: 1, resposta: 'Conforme' }, { id_pergunta: 2, resposta: 'Não Conforme', observacao: '   ' }], perguntas));
});

test('rejeita imagem de formato ou conteúdo inválido', () => {
    assert.throws(() => _internals.base64ParaBuffer('data:image/gif;base64,AAAA', 1024, 'Foto'));
    assert.throws(() => _internals.base64ParaBuffer('data:image/png;base64,not-base64!', 1024, 'Foto'));
    assert.throws(() => _internals.base64ParaBuffer(`data:image/png;base64,${Buffer.from('texto').toString('base64')}`, 1024, 'Foto'));
});

test('retorna erro de limite para imagem acima do máximo', () => {
    const bytes = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(10)]);
    assert.throws(() => _internals.base64ParaBuffer(`data:image/png;base64,${bytes.toString('base64')}`, 8, 'Foto'), { message: /excede/ });
});

test('rejeita submissão sem modelo, setor ou célula antes de acessar o banco', async () => {
    let conexoes = 0;
    db.connect = async () => { conexoes += 1; throw new Error('não deveria conectar'); };

    for (const campo of ['id_modelo', 'id_setor', 'id_celula']) {
        const req = submissaoValida();
        delete req.body[campo];
        const res = resposta();

        await assert.doesNotReject(() => checklist.salvarChecklist(req, res));
        assert.equal(res.statusCode, 400);
    }

    assert.equal(conexoes, 0);
});

test('rejeita IDs booleanos antes de acessar o banco', async () => {
    let conexoes = 0;
    db.connect = async () => { conexoes += 1; throw new Error('não deveria conectar'); };

    for (const campo of ['id_modelo', 'id_setor', 'id_celula']) {
        const req = submissaoValida();
        req.body[campo] = true;
        const res = resposta();

        await assert.doesNotReject(() => checklist.salvarChecklist(req, res));
        assert.equal(res.statusCode, 400);
    }

    assert.equal(conexoes, 0);
});

test('rejeita timestamp inválido antes de acessar o banco', async () => {
    let conexoes = 0;
    db.connect = async () => { conexoes += 1; throw new Error('não deveria conectar'); };
    const req = submissaoValida();
    req.body.inicio_checklist = 'data inválida';
    const res = resposta();

    await checklist.salvarChecklist(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(conexoes, 0);
    assert.equal(_internals.timestampOpcionalValido('2026-08-28T12:30:00.000Z'), true);
});

test('rejeita IDs de modelo inválidos no endpoint de perguntas antes do banco', async () => {
    let consultas = 0;
    db.query = async () => { consultas += 1; return { rows: [] }; };
    for (const modelo of ['', '0', '-1', '1abc', '1.5', true]) {
        const res = resposta();
        await checklist.buscarPerguntas({ params: { modelo } }, res);
        assert.equal(res.statusCode, 400, modelo);
    }
    assert.equal(consultas, 0);
});

test('endpoint de perguntas expõe a versão atual do modelo', async () => {
    db.query = async () => ({ rows: [{
        id_pergunta: 1,
        categoria: 'CATEGORIA',
        ctq: false,
        pergunta: 'Pergunta',
        identificacao: 'categoria_1',
        nome_modelo: 'Modelo',
        id_modelo_fk: 7,
        modelo_versao: 3,
    }] });
    const res = resposta();

    await checklist.buscarPerguntas({ params: { modelo: '7' } }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.modelo, { id: 7, nome: 'Modelo', versao: 3 });
});

test('rejeita setor ou célula inexistente/inativa antes de inserir submissão', async () => {
    for (const tabelaInvalida of ['setores', 'celulas_producao']) {
        const consultas = [];
        db.connect = async () => ({
            async query(sql, params = []) {
                consultas.push({ sql, params });
                if (/^(BEGIN|ROLLBACK|COMMIT)$/.test(sql)) return { rows: [] };
                if (/JOIN celulas_producao c/.test(sql)) return { rows: [] };
                if (/FROM modelo/.test(sql)) return { rows: [{ id: 10, nome: 'Modelo', marca: 'Marca' }] };
                if (new RegExp(`FROM ${tabelaInvalida}`).test(sql)) return { rows: [] };
                if (/FROM setores/.test(sql) || /FROM celulas_producao/.test(sql)) return { rows: [{ id: 1 }] };
                throw new Error(`consulta inesperada: ${sql}`);
            },
            release() {},
        });
        const res = resposta();

        await checklist.salvarChecklist(submissaoValida(), res);

        assert.equal(res.statusCode, 400);
        assert.equal(consultas.some(({ sql }) => /INSERT INTO formulario_submissoes/.test(sql)), false);
    }
});

test('rejeita modelo e célula de setores diferentes', async () => {
    const consultas = [];
    db.connect = async () => ({
        async query(sql, params = []) {
            consultas.push({ sql, params });
            if (/JOIN celulas_producao c/.test(sql)) return { rows: [] };
            if (/FROM modelo/.test(sql)) return { rows: [{ id: 10, nome: 'Modelo', marca: 'Marca' }] };
            if (/FROM setores/.test(sql)) return { rows: [{ id: 20 }] };
            if (/FROM celulas_producao/.test(sql)) return { rows: [{ id: 30, id_setor_fk: 30, id_marca_fk: 1 }] };
            if (/FROM perguntas/.test(sql)) return { rows: [{ id: 1, pergunta: 'Pergunta', identificacao: 'pergunta_1', categoria: 'Categoria', ctq: false }] };
            if (/INSERT INTO formulario_submissoes/.test(sql)) return { rows: [{ id: 50 }] };
            return { rows: [] };
        },
        release() {},
    });
    const res = resposta();

    await checklist.salvarChecklist(submissaoValida(), res);

    assert.equal(res.statusCode, 400);
    assert.equal(consultas.some(({ sql }) => /INSERT INTO formulario_submissoes/.test(sql)), false);
});

test('aceita modelo, setor e célula relacionados e persiste todos os IDs', async () => {
    const consultas = [];
    db.connect = async () => ({
        async query(sql, params = []) {
            consultas.push({ sql, params });
            if (/JOIN celulas_producao c/.test(sql)) {
                return { rows: [{ id: 10, nome: 'Modelo', marca: 'Marca', id_marca_fk: 1 }] };
            }
            if (/FROM modelo/.test(sql)) return { rows: [{ id: 10, nome: 'Modelo', marca: 'Marca', id_marca_fk: 1 }] };
            if (/FROM setores/.test(sql) || /FROM celulas_producao/.test(sql)) return { rows: [{ id: 1 }] };
            if (/FROM perguntas/.test(sql)) return { rows: [{ id: 1, pergunta: 'Pergunta', identificacao: 'pergunta_1', categoria: 'Categoria', ctq: false }] };
            if (/INSERT INTO formulario_submissoes/.test(sql)) return { rows: [{ id: 50 }] };
            return { rows: [] };
        },
        release() {},
    });
    const res = resposta();

    await checklist.salvarChecklist(submissaoValida(), res);

    const insert = consultas.find(({ sql }) => /INSERT INTO formulario_submissoes/.test(sql));
    assert.equal(res.statusCode, 201);
    assert.deepEqual(insert.params.slice(1, 4), [10, 20, 30]);
    const relacional = consultas.find(({ sql }) => /JOIN celulas_producao c/.test(sql));
    assert.deepEqual(relacional.params, [10, 20, 30]);
    assert.match(relacional.sql, /m\.id_setor_fk = s\.id/);
    assert.match(relacional.sql, /c\.id_setor_fk = s\.id/);
    assert.match(relacional.sql, /c\.id_marca_fk IS NULL OR c\.id_marca_fk = m\.id_marca_fk/);
});

test('persiste o MIME original da assinatura', async () => {
    const consultas = [];
    db.connect = async () => ({
        async query(sql, params = []) {
            consultas.push({ sql, params });
            if (/JOIN celulas_producao c/.test(sql)) return { rows: [{ id: 10, nome: 'Modelo', marca: 'Marca', id_marca_fk: 1 }] };
            if (/FROM perguntas/.test(sql)) return { rows: [{ id: 1, pergunta: 'Pergunta', identificacao: 'pergunta_1', categoria: 'Categoria', ctq: false }] };
            if (/INSERT INTO formulario_submissoes/.test(sql)) return { rows: [{ id: 50 }] };
            return { rows: [] };
        },
        release() {},
    });
    const req = submissaoValida();
    req.body.assinatura = imagemJpeg;
    const res = resposta();

    await checklist.salvarChecklist(req, res);

    const insert = consultas.find(({ sql }) => /INSERT INTO formulario_submissoes/.test(sql));
    assert.equal(res.statusCode, 201);
    assert.equal(insert.params[5], 'image/jpeg');
    assert.ok(Buffer.isBuffer(insert.params[4]));
});

test('persiste snapshot v2 completo e separa fotos da resposta', async () => {
    const consultas = [];
    db.connect = async () => ({
        async query(sql, params = []) {
            consultas.push({ sql, params });
            if (/JOIN celulas_producao c/.test(sql)) return { rows: [{
                id: 10, nome: 'Modelo', marca: 'FILA', id_marca_fk: 1, versao: 4,
                setor_id: 20, setor_nome: 'MONTAGEM', celula_id: 30, celula_nome: '2222',
            }] };
            if (/FROM usuarios u/.test(sql)) return { rows: [{
                id: 99, nome: 'Auditor', matricula: 'A-99', funcao: 'LIDER', papel: 'LIDER', unidade_id: 8, unidade_nome: 'ITAPIPOCA',
            }] };
            if (/FROM perguntas/.test(sql)) return { rows: [{ id: 1, pergunta: 'Pergunta', identificacao: 'pergunta_1', categoria: 'Categoria', ctq: false }] };
            if (/INSERT INTO formulario_submissoes/.test(sql)) return { rows: [{ id: 50 }] };
            return { rows: [] };
        },
        release() {},
    });
    const req = submissaoValida();
    req.body.respostas[0].foto = imagemJpeg;
    const res = resposta();

    await checklist.salvarChecklist(req, res);

    const insert = consultas.find(({ sql }) => /INSERT INTO formulario_submissoes/.test(sql));
    const snapshot = JSON.parse(insert.params[8]);
    const respostasPersistidas = JSON.parse(insert.params[6]);
    const evidencia = consultas.find(({ sql }) => /INSERT INTO formulario_evidencias/.test(sql));
    assert.equal(res.statusCode, 201);
    assert.equal(snapshot.schema, 2);
    assert.deepEqual(snapshot.modelo, { id: 10, nome: 'Modelo', marca: 'FILA', id_marca_fk: 1, versao: 4 });
    assert.deepEqual(snapshot.setor, { id: 20, nome: 'MONTAGEM' });
    assert.deepEqual(snapshot.celula, { id: 30, nome: '2222' });
    assert.deepEqual(snapshot.auditor, { id: 99, nome: 'Auditor', matricula: 'A-99', funcao: 'LIDER', papel: 'LIDER' });
    assert.deepEqual(snapshot.unidade, { id: 8, nome: 'ITAPIPOCA' });
    assert.equal(snapshot.evidencias.total, 1);
    assert.equal(Object.hasOwn(respostasPersistidas[0], 'foto'), false);
    assert.equal(evidencia.params[0], 50);
    assert.equal(evidencia.params[1], 1);
    assert.equal(evidencia.params[2], 'image/jpeg');
    assert.ok(Buffer.isBuffer(evidencia.params[4]));
});

test('validarAssinaturasCategorias exige assinatura para toda categoria com item não conforme', () => {
    const perguntasComCategoria = [
        { id: 1, categoria: 'Montagem' },
        { id: 2, categoria: 'Costura' },
        { id: 3, categoria: 'Acabamento' },
    ];
    const respostasNC = [
        { id_pergunta: 1, resposta: 'Não Conforme', observacao: 'Defeito 1' },
        { id_pergunta: 2, resposta: 'Conforme' },
        { id_pergunta: 3, resposta: 'Não Conforme', observacao: 'Defeito 2' },
    ];

    assert.throws(
        () => _internals.validarAssinaturasCategorias(respostasNC, perguntasComCategoria, {}),
        { message: /A assinatura para a categoria "(Montagem|Acabamento)" é obrigatória/ }
    );

    assert.throws(
        () => _internals.validarAssinaturasCategorias(respostasNC, perguntasComCategoria, { Montagem: imagem }),
        { message: /A assinatura para a categoria "Acabamento" é obrigatória/ }
    );

    const processadas = _internals.validarAssinaturasCategorias(respostasNC, perguntasComCategoria, {
        Montagem: imagem,
        Acabamento: imagemJpeg,
    });
    assert.equal(processadas.Montagem.mime, 'image/png');
    assert.equal(processadas.Acabamento.mime, 'image/jpeg');

    const respostasConformes = [
        { id_pergunta: 1, resposta: 'Conforme' },
        { id_pergunta: 2, resposta: 'Conforme' },
        { id_pergunta: 3, resposta: 'N/A' },
    ];
    const semNC = _internals.validarAssinaturasCategorias(respostasConformes, perguntasComCategoria, {});
    assert.deepEqual(semNC, {});
});

test('salvarChecklist rejeita se categoria não conforme não tiver assinatura e aceita quando enviada', async () => {
    db.connect = async () => ({
        async query(sql) {
            if (/JOIN celulas_producao c/.test(sql)) return { rows: [{ id: 10, nome: 'Modelo', marca: 'FILA', id_marca_fk: 1 }] };
            if (/FROM usuarios u/.test(sql)) return { rows: [{ id: 99, nome: 'Auditor' }] };
            if (/FROM perguntas/.test(sql)) return { rows: [
                { id: 1, pergunta: 'P1', identificacao: 'p1', categoria: 'Solado', ctq: false },
                { id: 2, pergunta: 'P2', identificacao: 'p2', categoria: 'Costura', ctq: false },
            ] };
            if (/INSERT INTO formulario_submissoes/.test(sql)) return { rows: [{ id: 77 }] };
            return { rows: [] };
        },
        release() {},
    });

    const reqFaltaAssinatura = submissaoValida();
    reqFaltaAssinatura.body.respostas = [
        { id_pergunta: 1, resposta: 'Não Conforme', observacao: 'Solado descolando' },
        { id_pergunta: 2, resposta: 'Conforme' },
    ];
    const res1 = resposta();
    await checklist.salvarChecklist(reqFaltaAssinatura, res1);
    assert.equal(res1.statusCode, 400);
    assert.match(res1.body.mensagem, /A assinatura para a categoria "Solado" é obrigatória/);

    const reqComAssinatura = submissaoValida();
    reqComAssinatura.body.respostas = [
        { id_pergunta: 1, resposta: 'Não Conforme', observacao: 'Solado descolando' },
        { id_pergunta: 2, resposta: 'Conforme' },
    ];
    reqComAssinatura.body.assinaturas_categorias = {
        Solado: imagem,
    };
    let paramsInsert = null;
    db.connect = async () => ({
        async query(sql, params = []) {
            if (/JOIN celulas_producao c/.test(sql)) return { rows: [{ id: 10, nome: 'Modelo', marca: 'FILA', id_marca_fk: 1 }] };
            if (/FROM usuarios u/.test(sql)) return { rows: [{ id: 99, nome: 'Auditor' }] };
            if (/FROM perguntas/.test(sql)) return { rows: [
                { id: 1, pergunta: 'P1', identificacao: 'p1', categoria: 'Solado', ctq: false },
                { id: 2, pergunta: 'P2', identificacao: 'p2', categoria: 'Costura', ctq: false },
            ] };
            if (/INSERT INTO formulario_submissoes/.test(sql)) {
                paramsInsert = params;
                return { rows: [{ id: 77 }] };
            }
            return { rows: [] };
        },
        release() {},
    });
    const res2 = resposta();
    await checklist.salvarChecklist(reqComAssinatura, res2);
    assert.equal(res2.statusCode, 201);
    const snapshotGravado = JSON.parse(paramsInsert[8]);
    assert.ok(snapshotGravado.assinaturas_categorias.Solado);
    assert.equal(snapshotGravado.assinaturas_categorias.Solado.mime, 'image/png');
});
