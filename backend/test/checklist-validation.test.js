const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../db');
const checklist = require('../controllers/ChecklistController');
const { _internals } = checklist;

const imagem = `data:image/png;base64,${Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]).toString('base64')}`;
const perguntas = [{ id: 1 }, { id: 2 }];
const connectOriginal = db.connect;

test.afterEach(() => {
    db.connect = connectOriginal;
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

test('aceita respostas completas e evidência Base64 válida', () => {
    assert.doesNotThrow(() => _internals.validarRespostas([
        { id_pergunta: 1, resposta: 'Conforme' },
        { id_pergunta: 2, resposta: 'Não Conforme', foto: imagem, observacao: 'Falha encontrada' },
    ], perguntas));
});

test('rejeita pergunta duplicada, enum inválido e não conformidade sem evidência', () => {
    assert.throws(() => _internals.validarRespostas([{ id_pergunta: 1, resposta: 'Conforme' }, { id_pergunta: 1, resposta: 'N/A' }], perguntas));
    assert.throws(() => _internals.validarRespostas([{ id_pergunta: 1, resposta: 'Outra' }, { id_pergunta: 2, resposta: 'N/A' }], perguntas));
    assert.throws(() => _internals.validarRespostas([{ id_pergunta: 1, resposta: 'Conforme' }, { id_pergunta: 2, resposta: 'Não Conforme', observacao: 'Sem foto' }], perguntas));
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
