const db = require('../db');

exports.listarModelosAtivos = async (req, res) => {
    try {
        const { marca_id, setor_id } = req.query;

        let query = `
            SELECT m.id, m.nome, COALESCE(m.id_marca_fk::text, m.marca) AS marca,
                m.id_marca_fk, ma.nome AS nome_marca, m.id_setor_fk
            FROM modelo m
            LEFT JOIN marcas ma ON ma.id = m.id_marca_fk
            WHERE m.ativo = true
        `;
        let values = [];
        let paramIndex = 1;

        if (marca_id) {
            query += ` AND m.id_marca_fk = $${paramIndex}`;
            values.push(marca_id);
            paramIndex++;
        }

        if (setor_id) {
            query += ` AND m.id_setor_fk = $${paramIndex}`;
            values.push(setor_id);
            paramIndex++;
        }

        query += ' ORDER BY m.nome ASC';

        const result = await db.query(query, values);
        res.status(200).json({ sucesso: true, dados: result.rows });
        
    } catch (error) {
        console.error('Erro ao buscar modelos ativos:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao buscar modelos.' });
    }
};
