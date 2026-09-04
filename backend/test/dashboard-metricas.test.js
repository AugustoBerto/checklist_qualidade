const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../db');
const dashboard = require('../controllers/DashboardController');
const { _internals } = dashboard;

const resposta = () => {
    const res = {
        statusCode: 200,
        body: null,
        status(codigo) {
            this.statusCode = codigo;
            return this;
        },
        json(dados) {
            this.body = dados;
            return this;
        },
    };
    return res;
};

test('validarFiltros do dashboard aceita parâmetros válidos e sanitiza valores', () => {
    const filtros = _internals.validarFiltros({
        dataInicio: '2026-09-01',
        dataFim: '2026-09-04',
        setorId: '10',
        celulaId: '20',
        marca: 'FILA',
        modeloId: '5',
    });

    assert.deepEqual(filtros, {
        dataInicio: '2026-09-01',
        dataFim: '2026-09-04',
        setorId: 10,
        celulaId: 20,
        marca: 'FILA',
        modeloId: 5,
    });
});

test('validarFiltros rejeita data final anterior à inicial e formatos inválidos', () => {
    assert.throws(
        () => _internals.validarFiltros({ dataInicio: '2026-09-10', dataFim: '2026-09-01' }),
        { message: /período informado é inválido/ }
    );
    assert.throws(
        () => _internals.validarFiltros({ dataInicio: 'invalida' }),
        { message: /Data inicial inválida/ }
    );
    assert.throws(
        () => _internals.validarFiltros({ setorId: '-5' }),
        { message: /Setor inválido/ }
    );
});

test('processarMetricas retorna estrutura zerada com 0 auditorias sem divisão por zero', () => {
    const resultado = _internals.processarMetricas([]);
    assert.deepEqual(resultado, {
        resumo: {
            totalAuditorias: 0,
            conformidadeMedia: 100,
            conformidadeCtq: 100,
            totalNaoConformidades: 0,
            tempoMedioMinutos: 0,
        },
        paretoCategorias: [],
        serieTemporal: [],
        rankingCelulas: [],
        topDefeitos: [],
    });
});

test('processarMetricas calcula indicadores, pareto, ranking e top defeitos corretamente', () => {
    const submissoes = [
        {
            id: 1,
            data_envio: '2026-09-01T10:15:00.000Z',
            inicio_checklist: '2026-09-01T10:00:00.000Z', // 15 minutos
            celula_id: '1',
            celula_nome: 'Célula 101',
            respostas: [
                { id_pergunta: 10, resposta: 'Conforme' },
                { id_pergunta: 20, resposta: 'Não Conforme', observacao: 'Falha 1' },
                { id_pergunta: 30, resposta: 'Não Conforme', observacao: 'Falha 2' },
            ],
            snapshot: {
                perguntas: [
                    { id: 10, pergunta: 'Ponto correto', categoria: 'Costura', ctq: true },
                    { id: 20, pergunta: 'Costura reta', categoria: 'Costura', ctq: false },
                    { id: 30, pergunta: 'Colagem firme', categoria: 'Montagem', ctq: true },
                ],
            },
        },
        {
            id: 2,
            data_envio: '2026-09-02T14:30:00.000Z',
            inicio_checklist: '2026-09-02T14:05:00.000Z', // 25 minutos
            celula_id: '2',
            celula_nome: 'Célula 102',
            respostas: [
                { id_pergunta: 10, resposta: 'Conforme' },
                { id_pergunta: 20, resposta: 'Conforme' },
                { id_pergunta: 30, resposta: 'Conforme' },
            ],
            snapshot: {
                perguntas: [
                    { id: 10, pergunta: 'Ponto correto', categoria: 'Costura', ctq: true },
                    { id: 20, pergunta: 'Costura reta', categoria: 'Costura', ctq: false },
                    { id: 30, pergunta: 'Colagem firme', categoria: 'Montagem', ctq: true },
                ],
            },
        },
    ];

    const metricas = _internals.processarMetricas(submissoes);

    // Resumo:
    // Submissão 1: Costura (1C, 1NC => NC), Montagem (1NC => NC) => 0/2 = 0%
    // Submissão 2: Costura (2C => C), Montagem (1C => C) => 2/2 = 100%
    // Média = 50%
    assert.equal(metricas.resumo.totalAuditorias, 2);
    assert.equal(metricas.resumo.conformidadeMedia, 50);
    assert.equal(metricas.resumo.totalNaoConformidades, 2);
    // Tempo médio = (15 + 25) / 2 = 20 min
    assert.equal(metricas.resumo.tempoMedioMinutos, 20);

    // CTQ:
    // Ponto correto (ctq): 2 Conformes
    // Colagem firme (ctq): 1 Não Conforme, 1 Conforme
    // Total CTQ: 3 C, 1 NC => 3 / 4 = 75%
    assert.equal(metricas.resumo.conformidadeCtq, 75);

    // Pareto: 1 NC em Costura, 1 NC em Montagem
    assert.equal(metricas.paretoCategorias.length, 2);
    assert.equal(metricas.paretoCategorias[0].quantidade, 1);
    assert.equal(metricas.paretoCategorias[0].percentual, 50);
    assert.equal(metricas.paretoCategorias[1].percentualAcumulado, 100);

    // Série temporal: 2 dias distintos
    assert.equal(metricas.serieTemporal.length, 2);
    assert.equal(metricas.serieTemporal[0].data, '2026-09-01');
    assert.equal(metricas.serieTemporal[0].conformidadeMedia, 0);
    assert.equal(metricas.serieTemporal[0].totalNC, 2);
    assert.equal(metricas.serieTemporal[1].data, '2026-09-02');
    assert.equal(metricas.serieTemporal[1].conformidadeMedia, 100);
    assert.equal(metricas.serieTemporal[1].totalNC, 0);

    // Ranking de Células: Célula 102 (100%) na frente de Célula 101 (0%)
    assert.equal(metricas.rankingCelulas[0].nome, 'Célula 102');
    assert.equal(metricas.rankingCelulas[0].conformidadeMedia, 100);
    assert.equal(metricas.rankingCelulas[1].nome, 'Célula 101');
    assert.equal(metricas.rankingCelulas[1].conformidadeMedia, 0);

    // Top Defeitos
    assert.equal(metricas.topDefeitos.length, 2);
    assert.ok(metricas.topDefeitos.some(d => d.pergunta === 'Costura reta'));
    assert.ok(metricas.topDefeitos.some(d => d.pergunta === 'Colagem firme'));
});

test('obterMetricas rejeita filtros inválidos com status 400', async () => {
    const res = resposta();
    await dashboard.obterMetricas({ query: { setorId: 'invalido' } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.sucesso, false);
});

test('obterMetricas executa consulta com filtros e retorna métricas estruturadas', async () => {
    let consultaExecutada = false;
    db.query = async (sql, params) => {
        consultaExecutada = true;
        assert.match(sql, /FROM formulario_submissoes s/);
        return {
            rows: [
                {
                    id: 99,
                    data_envio: '2026-09-04T12:00:00.000Z',
                    inicio_checklist: '2026-09-04T11:50:00.000Z',
                    celula_id: '5',
                    celula_nome: 'Linha A',
                    setor_id: '2',
                    setor_nome: 'Montagem',
                    respostas: [{ id_pergunta: 1, resposta: 'Conforme' }],
                    snapshot: { perguntas: [{ id: 1, pergunta: 'Item 1', categoria: 'Geral', ctq: false }] },
                },
            ],
        };
    };

    const res = resposta();
    await dashboard.obterMetricas({ query: { dataInicio: '2026-09-01' } }, res);

    assert.equal(consultaExecutada, true);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.sucesso, true);
    assert.equal(res.body.dados.resumo.totalAuditorias, 1);
    assert.equal(res.body.dados.resumo.conformidadeMedia, 100);
});
