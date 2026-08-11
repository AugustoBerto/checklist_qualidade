const db = require('../db');

const PAPEIS = new Set(['ADMIN', 'LIDER', 'INSPETOR']);
const DASS_COLABORADOR_BASE_URL = process.env.DASS_COLABORADOR_BASE_URL;

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
    if (!DASS_COLABORADOR_BASE_URL) {
        throw new Error('VALIDACAO_CENTRAL_NAO_CONFIGURADA');
    }
    const resposta = await fetch(`${DASS_COLABORADOR_BASE_URL.replace(/\/$/, '')}/${encodeURIComponent(matricula)}`);
    if (resposta.status === 404) return null;
    if (!resposta.ok) throw new Error('VALIDACAO_CENTRAL_INDISPONIVEL');
    const corpo = await resposta.json();
    return corpo.data || null;
};

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
            id_unidade_fk || null, id_setor_fk || null, id_celula_fk || null, id_turno_fk || null]);
        res.status(201).json({ sucesso: true, perfil: rows[0] });
    } catch (error) {
        console.error('Erro ao criar perfil:', error);
        res.status(error.code === '23505' ? 409 : 503).json({ sucesso: false, mensagem: 'Não foi possível validar ou criar o perfil.' });
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
            id_unidade_fk || null, id_setor_fk || null, id_celula_fk || null, id_turno_fk || null, req.params.id]);
        if (rows.length === 0) return res.status(404).json({ sucesso: false, mensagem: 'Perfil não encontrado.' });
        res.json({ sucesso: true, perfil: rows[0] });
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        res.status(error.code === '23505' ? 409 : 500).json({ sucesso: false, mensagem: 'Não foi possível atualizar o perfil.' });
    }
};
