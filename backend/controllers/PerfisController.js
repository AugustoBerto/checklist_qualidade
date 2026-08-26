const db = require('../db');

const PAPEIS = new Set(['ADMIN', 'LIDER', 'INSPETOR']);
const DASS_AUTH_BASE_URL = process.env.DASS_AUTH_BASE_URL || 'http://localhost:2123';

const camposPerfil = `
    id, nome, matricula, papel, ativo, funcao,
    id_unidade_fk, id_setor_fk, id_celula_fk, id_turno_fk
`;

const validarPerfil = (dados) => {
    if (!dados.matricula || !PAPEIS.has(dados.papel)) {
        return 'Matrícula e papel válido são obrigatórios.';
    }
    return null;
};

const buscarColaboradorCentral = async (matricula) => {
    if (!DASS_AUTH_BASE_URL) {
        throw new Error('VALIDACAO_CENTRAL_NAO_CONFIGURADA');
    }
    let resposta;
    try {
        const baseUrl = DASS_AUTH_BASE_URL.replace(/\/$/, '');
        resposta = await fetch(`${baseUrl}/colaborador/${encodeURIComponent(matricula)}`, { signal: AbortSignal.timeout(5000) });
    } catch (error) {
        if (error.name === 'TimeoutError' || error.name === 'AbortError') throw new Error('VALIDACAO_CENTRAL_TIMEOUT');
        throw new Error('VALIDACAO_CENTRAL_INDISPONIVEL');
    }
    if (resposta.status === 404) return null;
    if (!resposta.ok) throw new Error('VALIDACAO_CENTRAL_INDISPONIVEL');
    const corpo = await resposta.json();
    return corpo.data || null;
};

const normalizarIdFk = (id) => (id && Number.isInteger(Number(id)) && Number(id) > 0 ? Number(id) : null);

exports.me = async (req, res) => {
    res.json({ sucesso: true, perfil: req.usuario });
};

exports.listar = async (_req, res) => {
    try {
        const { rows } = await db.query(`SELECT ${camposPerfil} FROM usuarios ORDER BY nome ASC`);
        res.json({ sucesso: true, dados: rows });
    } catch (error) {
        console.error('Erro ao listar perfis:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar perfis.' });
    }
};

exports.criar = async (req, res) => {
    const erro = validarPerfil(req.body);
    if (erro) return res.status(400).json({ sucesso: false, mensagem: erro });

    const { matricula, papel, id_unidade_fk, id_setor_fk, id_celula_fk, id_turno_fk } = req.body;
    try {
        const colaborador = await buscarColaboradorCentral(matricula);
        if (!colaborador) return res.status(400).json({ sucesso: false, mensagem: 'Matrícula não encontrada no dass_auth.' });
        const { rows } = await db.query(`
            INSERT INTO usuarios (
                nome, matricula, papel, ativo, funcao,
                id_unidade_fk, id_setor_fk, id_celula_fk, id_turno_fk
            ) VALUES ($1, $2, $3, 1, $4, $5, $6, $7, $8)
            RETURNING ${camposPerfil}
        `, [colaborador.nome || null, matricula, papel, colaborador.funcao || null,
            normalizarIdFk(id_unidade_fk), normalizarIdFk(id_setor_fk), normalizarIdFk(id_celula_fk), normalizarIdFk(id_turno_fk)]);
        res.status(201).json({ sucesso: true, perfil: rows[0] });
    } catch (error) {
        console.error('Erro ao criar perfil:', error);
        if (error.code === '23505') return res.status(409).json({ sucesso: false, mensagem: 'Já existe um perfil para esta matrícula.' });
        if (error.message === 'VALIDACAO_CENTRAL_NAO_CONFIGURADA') return res.status(500).json({ sucesso: false, mensagem: 'A validação central não está configurada.' });
        if (error.message === 'VALIDACAO_CENTRAL_TIMEOUT') return res.status(504).json({ sucesso: false, mensagem: 'A validação central excedeu o tempo limite.' });
        if (error.message === 'VALIDACAO_CENTRAL_INDISPONIVEL') return res.status(503).json({ sucesso: false, mensagem: 'A validação central está indisponível.' });
        res.status(500).json({ sucesso: false, mensagem: 'Não foi possível criar o perfil.' });
    }
};

exports.atualizar = async (req, res) => {
    if (!PAPEIS.has(req.body.papel)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Papel válido é obrigatório.' });
    }

    const { papel, ativo, id_unidade_fk, id_setor_fk, id_celula_fk, id_turno_fk } = req.body;
    try {
        const { rows } = await db.query(`
            UPDATE usuarios SET
                papel = $1, ativo = $2,
                id_unidade_fk = $3, id_setor_fk = $4, id_celula_fk = $5, id_turno_fk = $6
            WHERE id = $7
            RETURNING ${camposPerfil}
        `, [papel, ativo === false || ativo === 0 ? 0 : 1,
            normalizarIdFk(id_unidade_fk), normalizarIdFk(id_setor_fk), normalizarIdFk(id_celula_fk), normalizarIdFk(id_turno_fk), req.params.id]);
        if (rows.length === 0) return res.status(404).json({ sucesso: false, mensagem: 'Perfil não encontrado.' });
        res.json({ sucesso: true, perfil: rows[0] });
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        res.status(error.code === '23505' ? 409 : 500).json({ sucesso: false, mensagem: 'Não foi possível atualizar o perfil.' });
    }
};
