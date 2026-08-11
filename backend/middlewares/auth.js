const jwt = require('jsonwebtoken');
const db = require('../db');
const JWT_SECRET = process.env.JWT_SECRET;
const INITIAL_ADMIN_MATRICULA = process.env.CHECKLIST_INITIAL_ADMIN_MATRICULA;

const extrairCookie = (cabecalho, nome) => {
    if (!cabecalho) return null;
    const prefixo = `${nome}=`;
    const item = cabecalho.split(';').map((parte) => parte.trim()).find((parte) => parte.startsWith(prefixo));
    return item ? decodeURIComponent(item.slice(prefixo.length)) : null;
};

const buscarOuCriarPerfilBootstrap = async (usuarioDecodificado) => {
    const matricula = String(usuarioDecodificado.matricula);
    const perfilExistente = await db.query(`
        SELECT id, nome, matricula, papel, ativo, funcao,
               id_unidade_fk, id_setor_fk, id_celula_fk, id_turno_fk
        FROM usuarios
        WHERE matricula = $1 AND ativo = 1
        LIMIT 1
    `, [matricula]);
    if (perfilExistente.rows.length > 0) return perfilExistente.rows[0];

    if (!INITIAL_ADMIN_MATRICULA || matricula !== INITIAL_ADMIN_MATRICULA) return null;

    const { rows } = await db.query(`
        INSERT INTO usuarios (nome, "codBar", ativo, funcao, nivelusuario, matricula, papel)
        SELECT $1, $2, 1, 'ADMIN', -1, $3, 'ADMIN'
        WHERE NOT EXISTS (SELECT 1 FROM usuarios)
        ON CONFLICT (matricula) WHERE matricula IS NOT NULL DO NOTHING
        RETURNING id, nome, matricula, papel, ativo, funcao,
                  id_unidade_fk, id_setor_fk, id_celula_fk, id_turno_fk
    `, [usuarioDecodificado.nome || usuarioDecodificado.usuario, usuarioDecodificado.codbarras || null, matricula]);

    if (rows.length > 0) return rows[0];
    const perfilCriadoPorOutraRequisicao = await db.query(`
        SELECT id, nome, matricula, papel, ativo, funcao,
               id_unidade_fk, id_setor_fk, id_celula_fk, id_turno_fk
        FROM usuarios
        WHERE matricula = $1 AND ativo = 1
        LIMIT 1
    `, [matricula]);
    return perfilCriadoPorOutraRequisicao.rows[0] || null;
};

const autorizar = (...permissoesPermitidas) => {
    return async (req, res, next) => {
        const token = extrairCookie(req.headers.cookie, 'token');

        if (!token) {
            return res.status(401).json({ sucesso: false, mensagem: 'Token de acesso não fornecido.' });
        }

        try {
            const usuarioDecodificado = jwt.verify(token, JWT_SECRET);
            if (!usuarioDecodificado.matricula) {
                return res.status(403).json({
                    sucesso: false,
                    codigo: 'PERFIL_CHECKLIST_NAO_CONFIGURADO',
                    mensagem: 'O token não possui matrícula para vincular o perfil do checklist.',
                });
            }

            const perfil = await buscarOuCriarPerfilBootstrap(usuarioDecodificado);
            if (!perfil || !perfil.papel) {
                return res.status(403).json({
                    sucesso: false,
                    codigo: 'PERFIL_CHECKLIST_NAO_LIBERADO',
                    mensagem: 'Seu usuário corporativo não possui acesso liberado ao Checklist.',
                });
            }
            const eAdmin = perfil.papel === 'ADMIN';

            const permissoesNormalizadas = permissoesPermitidas.flat().map((papel) => String(papel).toUpperCase());
            if (permissoesNormalizadas.length > 0) {
                // Se a rota for restrita para Administradores
                if (permissoesNormalizadas.includes('ADMIN') && !eAdmin) {
                    return res.status(403).json({ sucesso: false, mensagem: 'Acesso negado. Apenas administradores podem acessar este recurso.' });
                }

                // Se a rota exige permissão específica diferente de admin
                if (!eAdmin && !permissoesNormalizadas.includes(perfil.papel)) {
                    return res.status(403).json({ sucesso: false, mensagem: 'Acesso negado. Você não tem a permissão necessária.' });
                }
            }

            req.usuario = { ...usuarioDecodificado, ...perfil, admin: eAdmin };

            next();
        } catch (err) {
            return res.status(403).json({ sucesso: false, mensagem: 'Token inválido ou expirado.' });
        }
    };
};

module.exports = autorizar;
