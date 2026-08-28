const db = require('../db');
const { calcularPontuacao, normalizarResposta } = require('../utils/scoring');

exports.listarSubmissoes = async (req, res) => {
    try {
        const page = Math.min(Math.max(Number.parseInt(req.query.page, 10) || 1, 1), 10000);
        const pageSize = Math.min(Math.max(Number.parseInt(req.query.pageSize, 10) || 25, 1), 100);
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

        if (req.query.dataInicio) adicionarFiltro('s.data_envio >= ?::date', req.query.dataInicio);
        if (req.query.dataFim) adicionarFiltro("s.data_envio < (?::date + interval '1 day')", req.query.dataFim);
        if (req.query.marca) adicionarFiltro('COALESCE(ma.nome, m.marca) = ?', req.query.marca);
        if (req.query.modeloId) adicionarFiltro('s.id_modelo = ?::int', req.query.modeloId);
        if (req.query.setorId) adicionarFiltro('COALESCE(s.id_setor, st_cp.id, st_user.id) = ?::int', req.query.setorId);
        if (req.query.celulaId) adicionarFiltro('s.id_celula = ?::int', req.query.celulaId);
        if (req.query.busca) {
            const termo = `%${req.query.busca.trim()}%`;
            adicionarFiltro(
                "(u.nome ILIKE ? OR COALESCE(s.snapshot -> 'modelo' ->> 'nome', m.nome) ILIKE ? OR cp.nome ILIKE ? OR COALESCE(st_sub.nome, st_cp.nome, st_user.nome) ILIKE ?)",
                termo, termo, termo, termo
            );
        } else if (req.query.usuario) {
            adicionarFiltro('u.nome ILIKE ?', `%${req.query.usuario.trim()}%`);
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
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ sucesso: false, mensagem: 'ID de relatório inválido.' });
    try {
        const { rows } = await db.query(`
            SELECT s.id, s.data_envio, s.assinatura, s.respostas, s.snapshot, s.id_modelo,
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
        const dados = { id: submissao.id, nomeUsuario: submissao.nome_usuario, nomeModelo: submissao.snapshot?.modelo?.nome || submissao.nome_modelo, nomeCelula: submissao.nome_celula || 'Não informada', dataEnvio: submissao.data_envio, assinatura: submissao.assinatura ? `data:image/png;base64,${submissao.assinatura.toString('base64')}` : null, categorias: Object.create(null), pontuacao: 0 };
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
