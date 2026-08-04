const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

// Usando o rest operator (...) os argumentos viram um array automaticamente
const autorizar = (...permissoesPermitidas) => {
    return (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Pega apenas o token após o "Bearer"

        if (!token) {
            return res.status(401).json({ sucesso: false, mensagem: 'Token de acesso não fornecido.' });
        }

        try {
            // Verifica o token de forma síncrona (se falhar, cai direto no catch)
            const usuarioDecodificado = jwt.verify(token, JWT_SECRET);
            
            // Verifica a permissão se alguma foi exigida pela rota
            if (permissoesPermitidas.length > 0 && !permissoesPermitidas.includes(usuarioDecodificado.permissao)) {
                return res.status(403).json({ sucesso: false, mensagem: 'Acesso negado. Você não tem a permissão necessária.' });
            }
            
            // Anexa os dados do usuário à requisição (padronize usar sempre req.usuario ou req.user)
            req.usuario = usuarioDecodificado;
            
            next(); // Tudo certo, passa para o controller
        } catch (err) {
            // Cai aqui se o token for adulterado, estiver com assinatura errada ou expirado
            return res.status(403).json({ sucesso: false, mensagem: 'Token inválido ou expirado.' });
        }
    };
};

module.exports = autorizar;