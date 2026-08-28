const db = require('../db');
const MAX_PG_INT = 2147483647;
const idFiltroValido = (valor) => {
    const texto = typeof valor === 'string' ? valor.trim() : null;
    const numero = Number(texto === null ? valor : texto);
    return (typeof valor === 'number' && Number.isInteger(valor) || texto !== null && /^\d+$/.test(texto))
        && Number.isSafeInteger(numero) && numero > 0 && numero <= MAX_PG_INT;
};

exports.listarModelosAtivos = async (req, res) => {
    try {
        const { marca_id, setor_id } = req.query;
        if ((marca_id !== undefined && !idFiltroValido(marca_id)) || (setor_id !== undefined && !idFiltroValido(setor_id))) {
            return res.status(400).json({ sucesso: false, mensagem: 'Os filtros de marca e setor devem ser IDs positivos válidos.' });
        }

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
            values.push(Number(marca_id));
            paramIndex++;
        }

        if (setor_id) {
            query += ` AND m.id_setor_fk = $${paramIndex}`;
            values.push(Number(setor_id));
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
