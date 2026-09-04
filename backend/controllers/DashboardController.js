const db = require('../db');
const { calcularConformidade, normalizarResposta } = require('../utils/scoring');

const MAX_PG_INT = 2147483647;
const FILTRO_INVALIDO = 'FILTRO_INVALIDO';

const inteiroPositivo = (valor, campo, { max = MAX_PG_INT } = {}) => {
    const texto = typeof valor === 'string' ? valor.trim() : null;
    const valido = (typeof valor === 'number' && Number.isInteger(valor))
        || (texto !== null && /^\d+$/.test(texto));
    const numero = Number(texto === null ? valor : texto);
    if (!valido || !Number.isSafeInteger(numero) || numero <= 0 || numero > max) {
        const erro = new Error(`${campo} inválido.`);
        erro.code = FILTRO_INVALIDO;
        throw erro;
    }
    return numero;
};

const dataValida = (valor, campo) => {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        const erro = new Error(`${campo} inválida. Use o formato AAAA-MM-DD.`);
        erro.code = FILTRO_INVALIDO;
        throw erro;
    }
    const [ano, mes, dia] = valor.split('-').map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    if (ano < 1 || data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) {
        const erro = new Error(`${campo} inválida. Use uma data existente.`);
        erro.code = FILTRO_INVALIDO;
        throw erro;
    }
    return valor;
};

const textoFiltro = (valor, campo) => {
    if (valor === undefined) return null;
    if (typeof valor !== 'string') {
        const erro = new Error(`${campo} inválido.`);
        erro.code = FILTRO_INVALIDO;
        throw erro;
    }
    return valor.trim();
};

const validarFiltros = (query = {}) => {
    const dataInicio = query.dataInicio === undefined ? null : dataValida(query.dataInicio, 'Data inicial');
    const dataFim = query.dataFim === undefined ? null : dataValida(query.dataFim, 'Data final');
    if (dataInicio && dataFim && dataInicio > dataFim) {
        const erro = new Error('O período informado é inválido: a data inicial não pode ser posterior à data final.');
        erro.code = FILTRO_INVALIDO;
        throw erro;
    }
    return {
        dataInicio,
        dataFim,
        marca: textoFiltro(query.marca, 'Marca'),
        modeloId: query.modeloId === undefined ? null : inteiroPositivo(query.modeloId, 'Modelo'),
        setorId: query.setorId === undefined ? null : inteiroPositivo(query.setorId, 'Setor'),
        celulaId: query.celulaId === undefined ? null : inteiroPositivo(query.celulaId, 'Célula'),
    };
};

const processarMetricas = (rows = []) => {
    const totalAuditorias = rows.length;
    if (totalAuditorias === 0) {
        return {
            resumo: {
                totalAuditorias: 0,
                conformidadeMedia: 100,
                conformidadeCtq: 100,
                totalNaoConformidades: 0,
                tempoMedioMinutos: 0,
            },
            faixasConformidade: {
                metaAtingida: 0,
                alerta: 0,
                critico: 0,
            },
            detalheCtq: {
                totalConforme: 0,
                totalNaoConforme: 0,
                totalItens: 0,
                conformidadeCtq: 100,
            },
            severidadeNC: {
                totalNC: 0,
                ctq: 0,
                geral: 0,
            },
            paretoCategorias: [],
            serieTemporal: [],
            rankingCelulas: [],
            topDefeitos: [],
        };
    }

    let somaPontuacoes = 0;
    let totalNC = 0;
    let totalCtqConforme = 0;
    let totalCtqNaoConforme = 0;
    let totalMetaAtingida = 0;
    let totalAlerta = 0;
    let totalCritico = 0;
    const duracoesValidas = [];
    const contagemCategoriasNC = Object.create(null);
    const contagemDefeitos = Object.create(null);
    const agrupamentoPorDia = Object.create(null);
    const agrupamentoPorCelula = Object.create(null);

    for (const submissao of rows) {
        const perguntasSnapshot = submissao.snapshot?.perguntas || [];
        const pontuacao = calcularConformidade(submissao.respostas, perguntasSnapshot);
        somaPontuacoes += pontuacao;

        if (pontuacao >= 95) {
            totalMetaAtingida += 1;
        } else if (pontuacao >= 85) {
            totalAlerta += 1;
        } else {
            totalCritico += 1;
        }

        // Data do dia (YYYY-MM-DD)
        const diaStr = submissao.data_envio instanceof Date
            ? submissao.data_envio.toISOString().slice(0, 10)
            : String(submissao.data_envio).slice(0, 10);

        if (!agrupamentoPorDia[diaStr]) {
            agrupamentoPorDia[diaStr] = { data: diaStr, total: 0, somaPontuacao: 0, totalNC: 0 };
        }
        agrupamentoPorDia[diaStr].total += 1;
        agrupamentoPorDia[diaStr].somaPontuacao += pontuacao;

        // Célula
        const cId = submissao.celula_id || '0';
        const cNome = submissao.celula_nome || 'Não informada';
        const chaveCelula = `${cId}_${cNome}`;
        if (!agrupamentoPorCelula[chaveCelula]) {
            agrupamentoPorCelula[chaveCelula] = { id: cId, nome: cNome, total: 0, somaPontuacao: 0, totalNC: 0 };
        }
        agrupamentoPorCelula[chaveCelula].total += 1;
        agrupamentoPorCelula[chaveCelula].somaPontuacao += pontuacao;

        // Duração da auditoria
        if (submissao.inicio_checklist && submissao.data_envio) {
            const diffMs = new Date(submissao.data_envio) - new Date(submissao.inicio_checklist);
            const diffMin = diffMs / 60000;
            if (diffMin >= 0.5 && diffMin <= 1440) {
                duracoesValidas.push(diffMin);
            }
        }

        // Perguntas indexadas por ID
        const perguntasMap = new Map(perguntasSnapshot.map((p) => [Number(p.id), p]));

        const respostas = Array.isArray(submissao.respostas) ? submissao.respostas : [];
        for (const item of respostas) {
            const idPergunta = Number(item.id_pergunta);
            const perguntaInfo = perguntasMap.get(idPergunta);
            const categoriaNome = perguntaInfo?.categoria || 'Geral';
            const isCtq = Boolean(perguntaInfo?.ctq);
            const respostaTexto = normalizarResposta(item.resposta);

            if (isCtq) {
                if (respostaTexto === 'não conforme') totalCtqNaoConforme += 1;
                else if (respostaTexto === 'conforme' || respostaTexto === 'n/a') totalCtqConforme += 1;
            }

            if (respostaTexto === 'não conforme') {
                totalNC += 1;
                agrupamentoPorDia[diaStr].totalNC += 1;
                agrupamentoPorCelula[chaveCelula].totalNC += 1;

                contagemCategoriasNC[categoriaNome] = (contagemCategoriasNC[categoriaNome] || 0) + 1;

                const perguntaTexto = perguntaInfo?.pergunta || `Item #${idPergunta}`;
                if (!contagemDefeitos[perguntaTexto]) {
                    contagemDefeitos[perguntaTexto] = {
                        pergunta: perguntaTexto,
                        categoria: categoriaNome,
                        ctq: isCtq,
                        quantidadeNC: 0,
                    };
                }
                contagemDefeitos[perguntaTexto].quantidadeNC += 1;
            }
        }
    }

    const conformidadeMedia = Math.round(somaPontuacoes / totalAuditorias);
    const totalItensCtq = totalCtqConforme + totalCtqNaoConforme;
    const conformidadeCtq = totalItensCtq > 0
        ? Math.round((totalCtqConforme / totalItensCtq) * 100)
        : 100;
    const tempoMedioMinutos = duracoesValidas.length > 0
        ? Math.round((duracoesValidas.reduce((a, b) => a + b, 0) / duracoesValidas.length) * 10) / 10
        : 0;

    // Pareto de Categorias com curva acumulada
    let acumulado = 0;
    const paretoCategorias = Object.entries(contagemCategoriasNC)
        .map(([categoria, quantidade]) => ({ categoria, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .map((item) => {
            const percentual = totalNC > 0 ? Math.round((item.quantidade / totalNC) * 1000) / 10 : 0;
            acumulado += item.quantidade;
            const percentualAcumulado = totalNC > 0 ? Math.round((acumulado / totalNC) * 1000) / 10 : 0;
            return {
                ...item,
                percentual,
                percentualAcumulado: Math.min(percentualAcumulado, 100),
            };
        });

    // Série temporal ordenada por data crescente
    const serieTemporal = Object.values(agrupamentoPorDia)
        .sort((a, b) => a.data.localeCompare(b.data))
        .map((dia) => ({
            data: dia.data,
            totalAuditorias: dia.total,
            conformidadeMedia: Math.round(dia.somaPontuacao / dia.total),
            totalNC: dia.totalNC,
        }));

    // Ranking de Células
    const rankingCelulas = Object.values(agrupamentoPorCelula)
        .map((c) => ({
            id: c.id,
            nome: c.nome,
            totalAuditorias: c.total,
            conformidadeMedia: Math.round(c.somaPontuacao / c.total),
            totalNC: c.totalNC,
        }))
        .sort((a, b) => b.conformidadeMedia - a.conformidadeMedia || b.totalAuditorias - a.totalAuditorias);

    // Top 5 defeitos com maior incidência
    const topDefeitos = Object.values(contagemDefeitos)
        .sort((a, b) => b.quantidadeNC - a.quantidadeNC)
        .slice(0, 5);

    const faixasConformidade = {
        metaAtingida: totalMetaAtingida,
        alerta: totalAlerta,
        critico: totalCritico,
    };

    const detalheCtq = {
        totalConforme: totalCtqConforme,
        totalNaoConforme: totalCtqNaoConforme,
        totalItens: totalItensCtq,
        conformidadeCtq,
    };

    const severidadeNC = {
        totalNC,
        ctq: totalCtqNaoConforme,
        geral: Math.max(0, totalNC - totalCtqNaoConforme),
    };

    return {
        resumo: {
            totalAuditorias,
            conformidadeMedia,
            conformidadeCtq,
            totalNaoConformidades: totalNC,
            tempoMedioMinutos,
        },
        faixasConformidade,
        detalheCtq,
        severidadeNC,
        paretoCategorias,
        serieTemporal,
        rankingCelulas,
        topDefeitos,
    };
};

exports.obterMetricas = async (req, res) => {
    let opcoes;
    try {
        opcoes = validarFiltros(req.query || {});
    } catch (error) {
        if (error.code === FILTRO_INVALIDO) return res.status(400).json({ sucesso: false, mensagem: error.message });
        throw error;
    }

    try {
        const { dataInicio, dataFim, marca, modeloId, setorId, celulaId } = opcoes;
        const filtros = [];
        const valores = [];
        const adicionarFiltro = (sql, ...vals) => {
            let s = sql;
            vals.forEach((val) => {
                valores.push(val);
                s = s.replace('?', `$${valores.length}`);
            });
            filtros.push(s);
        };

        if (dataInicio) adicionarFiltro('s.data_envio >= ?::date', dataInicio);
        if (dataFim) adicionarFiltro("s.data_envio < (?::date + interval '1 day')", dataFim);
        if (marca) adicionarFiltro("COALESCE(s.snapshot -> 'marca' ->> 'nome', s.snapshot -> 'modelo' ->> 'marca', ma.nome, m.marca) = ?", marca);
        if (modeloId) adicionarFiltro('s.id_modelo = ?::int', modeloId);
        if (setorId) adicionarFiltro('COALESCE(s.id_setor, st_cp.id, st_user.id) = ?::int', setorId);
        if (celulaId) adicionarFiltro('s.id_celula = ?::int', celulaId);

        const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
        const joins = `
            FROM formulario_submissoes s
            LEFT JOIN usuarios u ON s.id_usuario = u.id
            LEFT JOIN modelo m ON s.id_modelo = m.id
            LEFT JOIN marcas ma ON ma.id = m.id_marca_fk
            LEFT JOIN celulas_producao cp ON s.id_celula = cp.id
            LEFT JOIN setores st_sub ON s.id_setor = st_sub.id
            LEFT JOIN setores st_cp ON cp.id_setor_fk = st_cp.id
            LEFT JOIN setores st_user ON u.id_setor_fk = st_user.id
        `;
        const sql = `
            SELECT
                s.id,
                s.data_envio,
                s.inicio_checklist,
                s.respostas,
                s.snapshot,
                COALESCE(s.snapshot -> 'celula' ->> 'id', cp.id::text) AS celula_id,
                COALESCE(s.snapshot -> 'celula' ->> 'nome', cp.nome, 'Não informada') AS celula_nome,
                COALESCE(s.snapshot -> 'setor' ->> 'id', st_sub.id::text, st_cp.id::text, st_user.id::text) AS setor_id,
                COALESCE(s.snapshot -> 'setor' ->> 'nome', st_sub.nome, st_cp.nome, st_user.nome, 'Geral') AS setor_nome
            ${joins}
            ${where}
            ORDER BY s.data_envio ASC
        `;

        const { rows } = await db.query(sql, valores);
        const metricas = processarMetricas(rows);

        res.json({
            sucesso: true,
            dados: metricas,
        });
    } catch (error) {
        console.error('Erro ao obter métricas do dashboard:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao processar indicadores do dashboard.' });
    }
};

exports._internals = {
    inteiroPositivo,
    dataValida,
    textoFiltro,
    validarFiltros,
    processarMetricas,
};
