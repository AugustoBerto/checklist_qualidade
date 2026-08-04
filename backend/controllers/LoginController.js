const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

const TABELAS_PERMITIDAS = ['admin', 'usuarios']; 

exports.LoginUser = async (req, res) => {
    const { usuario, senha } = req.body;
    const { tipo } = req.params; 

    if (!TABELAS_PERMITIDAS.includes(tipo)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Tipo de login inválido.' });
    }
    if (!usuario || !senha) {
        return res.status(400).json({ sucesso: false, mensagem: 'Dados de login e senha não fornecidos.' });
    }

    try {
        // 📌 NOVA LÓGICA: Traz os dados da Célula e Setor se for usuário de fábrica
        let sql = `SELECT * FROM ${tipo} WHERE nome = $1`;
        if (tipo === 'usuarios') {
            sql = `
                SELECT u.*, s.nome AS nome_setor, cp.nome AS nome_celula, t.nome AS nome_turno
                FROM usuarios u
                LEFT JOIN setores s ON u.id_setor_fk = s.id
                LEFT JOIN celulas_producao cp ON u.id_celula_fk = cp.id
                LEFT JOIN turnos t ON u.id_turno_fk = t.id
                WHERE u.nome = $1 AND u.ativo IN (1, 2)
            `;
        }

        const result = await pool.query(sql, [usuario]);

        if (result.rows.length === 0) {
            return res.status(401).json({ sucesso: false, mensagem: 'Usuário ou senha inválidos.' });
        }

        const user = result.rows[0];
        const senhaCorreta = await bcrypt.compare(senha, user.senha);

        if (!senhaCorreta) {
            return res.status(401).json({ sucesso: false, mensagem: 'Usuário ou senha inválidos.' });
        }

        const token = jwt.sign({
            id: user.id,
            nome: user.nome,
            permissao: tipo,
            id_unidade_fk: user.id_unidade_fk || null
        }, JWT_SECRET, { expiresIn: '2h' });

        res.json({ 
            sucesso: true, 
            token, 
            usuario: {
                id: user.id,
                nome: user.nome,
                permissao: tipo,
                admin: tipo === 'admin',
                nivelusuario: user.nivelusuario,
                id_unidade_fk: user.id_unidade_fk,
                id_setor_fk: user.id_setor_fk,
                id_celula_fk: user.id_celula_fk,
                id_turno_fk: user.id_turno_fk,
                nome_setor: user.nome_setor || 'N/A',
                nome_celula: user.nome_celula || 'N/A',
                nome_turno: user.nome_turno || 'N/A'
            }
        });

    } catch (error) {
        console.error(`Erro no login (${tipo}) com usuário/senha:`, error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro no servidor.' });
    }
}

exports.LoginUserCodBar = async (req, res) => {
    const { codBar } = req.body;
    const { tipo } = req.params; 

    if (!TABELAS_PERMITIDAS.includes(tipo)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Tipo de login inválido.' });
    }

    if (!codBar) {
        return res.status(400).json({ sucesso: false, mensagem: 'Código de barras não fornecido.' });
    }

    try {
        let sql = `SELECT * FROM ${tipo} WHERE "codBar" = $1`;
        if (tipo === 'usuarios') {
            sql = `
                SELECT u.*, s.nome AS nome_setor, cp.nome AS nome_celula, t.nome AS nome_turno
                FROM usuarios u
                LEFT JOIN setores s ON u.id_setor_fk = s.id
                LEFT JOIN celulas_producao cp ON u.id_celula_fk = cp.id
                LEFT JOIN turnos t ON u.id_turno_fk = t.id
                WHERE u."codBar" = $1
            `;
        }

        const result = await pool.query(sql, [codBar]);

        if (result.rows.length === 0) {
            return res.status(401).json({ sucesso: false, mensagem: 'Crachá não encontrado.' });
        }

        const user = result.rows[0];

        const token = jwt.sign({
            id: user.id,
            nome: user.nome,
            permissao: tipo,
            id_unidade_fk: user.id_unidade_fk || null
        }, JWT_SECRET, { expiresIn: '2h' });

        res.json({ 
            sucesso: true, 
            token, 
            usuario: {
                id: user.id,
                nome: user.nome,
                permissao: tipo,
                admin: tipo === 'admin',
                nivelusuario: user.nivelusuario,
                id_unidade_fk: user.id_unidade_fk,
                id_setor_fk: user.id_setor_fk,
                id_celula_fk: user.id_celula_fk,
                id_turno_fk: user.id_turno_fk,
                nome_setor: user.nome_setor || 'N/A',
                nome_celula: user.nome_celula || 'N/A',
                nome_turno: user.nome_turno || 'N/A'
            }
        });

    } catch (error) {
        console.error(`Erro no login (${tipo}) com código de barras:`, error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro no servidor.' });
    }
}