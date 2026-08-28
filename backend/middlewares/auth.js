const jwt = require('jsonwebtoken');
const db = require('../db');
const JWT_SECRET = process.env.JWT_SECRET;
const INITIAL_ADMIN_MATRICULA = process.env.CHECKLIST_INITIAL_ADMIN_MATRICULA;

const camposPerfil = `
    id, nome, matricula, papel, ativo, funcao,
    id_unidade_fk, id_setor_fk, id_celula_fk, id_turno_fk
`;

const extrairCookie = (cabecalho, nome) => {
    if (!cabecalho) return null;
    const prefixo = `${nome}=`;
    const item = cabecalho.split(';').map((parte) => parte.trim()).find((parte) => parte.startsWith(prefixo));
    return item ? decodeURIComponent(item.slice(prefixo.length)) : null;
};

const sincronizarPerfil = async (usuarioDecodificado) => {
    const matricula = String(usuarioDecodificado.matricula);
    const nome = usuarioDecodificado.nome || usuarioDecodificado.usuario || matricula;
    const funcao = usuarioDecodificado.funcao || null;
    const codBar = usuarioDecodificado.codbarras || null;
    const sincronizado = await db.query(`
        INSERT INTO usuarios (nome, "codBar", ativo, funcao, matricula, papel)
        VALUES ($1, $2, 0, $3, $4, 'PENDENTE')
        ON CONFLICT (matricula) DO UPDATE SET
            nome = EXCLUDED.nome,
            "codBar" = COALESCE(EXCLUDED."codBar", usuarios."codBar"),
            funcao = EXCLUDED.funcao
        RETURNING ${camposPerfil}
    `, [nome, codBar, funcao, matricula]);
    let perfil = sincronizado.rows[0];

    if (INITIAL_ADMIN_MATRICULA && matricula === INITIAL_ADMIN_MATRICULA && perfil.papel === 'PENDENTE') {
        const bootstrap = await db.query(`
            UPDATE usuarios
               SET papel = 'ADMIN', ativo = 1
             WHERE id = $1
               AND papel = 'PENDENTE'
               AND NOT EXISTS (SELECT 1 FROM usuarios WHERE papel <> 'PENDENTE')
            RETURNING ${camposPerfil}
        `, [perfil.id]);
        perfil = bootstrap.rows[0] || perfil;
    }

    return perfil;
};

const autorizar = (...permissoesPermitidas) => {
    return async (req, res, next) => {
        let token;
        try {
            token = extrairCookie(req.headers.cookie, 'token');
        } catch (err) {
            if (err instanceof URIError) {
                return res.status(401).json({ sucesso: false, mensagem: 'Token inválido ou expirado.' });
            }
            return next(err);
        }

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

            const perfil = await sincronizarPerfil(usuarioDecodificado);
            if (!perfil || perfil.papel === 'PENDENTE' || Number(perfil.ativo) !== 1) {
                return res.status(403).json({
                    sucesso: false,
                    codigo: 'PERFIL_CHECKLIST_PENDENTE',
                    mensagem: 'Seu perfil foi identificado e aguarda liberação por um administrador do Checklist.',
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
            if (err instanceof jwt.JsonWebTokenError) {
                return res.status(401).json({ sucesso: false, mensagem: 'Token inválido ou expirado.' });
            }
            return next(err);
        }
    };
};

module.exports = autorizar;
module.exports.sincronizarPerfil = sincronizarPerfil;
