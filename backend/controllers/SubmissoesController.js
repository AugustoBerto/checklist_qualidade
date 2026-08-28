const db = require('../db');
const { calcularPontuacao, normalizarResposta } = require('../utils/scoring');

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
    const page = query.page === undefined ? 1 : Math.min(inteiroPositivo(query.page, 'Página'), 10000);
    const pageSize = query.pageSize === undefined ? 25 : Math.min(inteiroPositivo(query.pageSize, 'Tamanho da página'), 100);
    const dataInicio = query.dataInicio === undefined ? null : dataValida(query.dataInicio, 'Data inicial');
    const dataFim = query.dataFim === undefined ? null : dataValida(query.dataFim, 'Data final');
    if (dataInicio && dataFim && dataInicio > dataFim) {
        const erro = new Error('O período informado é inválido: a data inicial não pode ser posterior à data final.');
        erro.code = FILTRO_INVALIDO;
        throw erro;
    }
    return {
        page,
        pageSize,
        dataInicio,
        dataFim,
        marca: textoFiltro(query.marca, 'Marca'),
        modeloId: query.modeloId === undefined ? null : inteiroPositivo(query.modeloId, 'Modelo'),
        setorId: query.setorId === undefined ? null : inteiroPositivo(query.setorId, 'Setor'),
        celulaId: query.celulaId === undefined ? null : inteiroPositivo(query.celulaId, 'Célula'),
        busca: textoFiltro(query.busca, 'Busca'),
        usuario: textoFiltro(query.usuario, 'Usuário'),
    };
};

exports.listarSubmissoes = async (req, res) => {
    let opcoes;
    try {
        opcoes = validarFiltros(req.query || {});
    } catch (error) {
        if (error.code === FILTRO_INVALIDO) return res.status(400).json({ sucesso: false, mensagem: error.message });
        throw error;
    }
    try {
        const { page, pageSize, dataInicio, dataFim, marca, modeloId, setorId, celulaId, busca, usuario } = opcoes;
        const filtros = [];
        const valores = [];
        const adicionarFiltro = (sql, ...vals) => {
            let s = sql;
            vals.forEach(val => {
                valores.push(val);
                s = s.replace('?', `$${valores.length}`);
            });
            filtros.push(s);
        };

        if (dataInicio) adicionarFiltro('s.data_envio >= ?::date', dataInicio);
        if (dataFim) adicionarFiltro("s.data_envio < (?::date + interval '1 day')", dataFim);
        if (marca) adicionarFiltro('COALESCE(ma.nome, m.marca) = ?', marca);
        if (modeloId) adicionarFiltro('s.id_modelo = ?::int', modeloId);
        if (setorId) adicionarFiltro('COALESCE(s.id_setor, st_cp.id, st_user.id) = ?::int', setorId);
        if (celulaId) adicionarFiltro('s.id_celula = ?::int', celulaId);
        if (busca) {
            const termo = `%${busca}%`;
            adicionarFiltro(
                "(u.nome ILIKE ? OR COALESCE(s.snapshot -> 'modelo' ->> 'nome', m.nome) ILIKE ? OR cp.nome ILIKE ? OR COALESCE(st_sub.nome, st_cp.nome, st_user.nome) ILIKE ?)",
                termo, termo, termo, termo
            );
        } else if (usuario) {
            adicionarFiltro('u.nome ILIKE ?', `%${usuario}%`);
        }

        const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
        const joins = `FROM formulario_submissoes s JOIN usuarios u ON s.id_usuario = u.id JOIN modelo m ON s.id_modelo = m.id LEFT JOIN marcas ma ON ma.id = m.id_marca_fk LEFT JOIN celulas_producao cp ON s.id_celula = cp.id LEFT JOIN setores st_sub ON s.id_setor = st_sub.id LEFT JOIN setores st_cp ON cp.id_setor_fk = st_cp.id LEFT JOIN setores st_user ON u.id_setor_fk = st_user.id`;
        const sql = `SELECT s.id, s.data_envio, u.nome AS nome_usuario, COALESCE(s.snapshot -> 'modelo' ->> 'nome', m.nome) AS nome_modelo, cp.nome AS nome_celula, COALESCE(st_sub.nome, st_cp.nome, st_user.nome, 'Geral') AS nome_setor ${joins} ${where} ORDER BY s.data_envio DESC`;
        const [totalResult, resultado] = await Promise.all([
            db.query(`SELECT count(*) ${joins} ${where}`, valores),
            db.query(`${sql} LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}`, [...valores, pageSize, (page - 1) * pageSize]),
        ]);
        const total = Number(totalResult.rows[0].count);
        res.json({ sucesso: true, dados: resultado.rows, paginacao: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
    } catch (error) {
        console.error('Erro ao listar submissões:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao listar submissões.' });
    }
};

exports.buscarDetalhesSubmissao = async (req, res) => {
    let id;
    try {
        id = inteiroPositivo(req.params.id, 'ID de relatório');
    } catch (error) {
        if (error.code === FILTRO_INVALIDO) return res.status(400).json({ sucesso: false, mensagem: error.message });
        throw error;
    }
    try {
        const { rows } = await db.query(`
            SELECT s.id, s.data_envio, s.assinatura, s.assinatura_mime, s.respostas, s.snapshot, s.id_modelo,
                u.nome AS nome_usuario, m.nome AS nome_modelo, cp.nome AS nome_celula
            FROM formulario_submissoes s
            JOIN usuarios u ON s.id_usuario = u.id JOIN modelo m ON s.id_modelo = m.id
            LEFT JOIN celulas_producao cp ON s.id_celula = cp.id WHERE s.id = $1
        `, [id]);
        if (!rows.length) return res.status(404).json({ sucesso: false, mensagem: 'Relatório não encontrado.' });
        const submissao = rows[0];
        const perguntas = new Map();
        if (submissao.snapshot?.perguntas) {
            submissao.snapshot.perguntas.forEach((pergunta) => perguntas.set(Number(pergunta.id), pergunta));
        } else {
            const legado = await db.query(`SELECT p.id, p.pergunta, c.categoria FROM perguntas p LEFT JOIN categorias c ON c.id = p.id_categoria WHERE p.id_modelo = $1`, [submissao.id_modelo]);
            legado.rows.forEach((pergunta) => perguntas.set(Number(pergunta.id), { ...pergunta, categoria: pergunta.categoria || 'Geral' }));
        }
        const dados = { id: submissao.id, nomeUsuario: submissao.nome_usuario, nomeModelo: submissao.snapshot?.modelo?.nome || submissao.nome_modelo, nomeCelula: submissao.nome_celula || 'Não informada', dataEnvio: submissao.data_envio, assinatura: submissao.assinatura ? `data:${submissao.assinatura_mime || 'image/png'};base64,${submissao.assinatura.toString('base64')}` : null, categorias: Object.create(null), pontuacao: 0 };
        const paraPontuar = Object.create(null);
        submissao.respostas.forEach((resposta) => {
            const pergunta = perguntas.get(Number(resposta.id_pergunta));
            const categoria = pergunta?.categoria || 'Geral';
            (dados.categorias[categoria] ||= []).push({ pergunta: pergunta?.pergunta || 'Item removido/descontinuado', resposta: resposta.resposta, foto: resposta.foto, observacao: resposta.observacao });
            (paraPontuar[categoria] ||= []).push(normalizarResposta(resposta.resposta));
        });
        const { total_C, total_NC, total_NP, total_NA } = calcularPontuacao(paraPontuar);
        const total = total_C + total_NC + total_NP + total_NA;
        dados.pontuacao = total ? Math.round(((total_C + total_NA) / total) * 100) : 100;
        res.json({ sucesso: true, dados });
    } catch (error) {
        console.error('Erro ao buscar detalhes da submissão:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao processar detalhes da consulta.' });
    }
};

exports._internals = { inteiroPositivo, dataValida, validarFiltros };
