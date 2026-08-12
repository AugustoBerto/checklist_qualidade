const db = require('../db');

exports.listarMarcas = async (req, res) => {
    try {
        const result = await db.query('SELECT id, nome FROM marcas ORDER BY nome ASC');
        res.status(200).json({ sucesso: true, marcas: result.rows });
    } catch (error) {
        console.error('Erro ao buscar marcas:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao buscar marcas.' });
    }
};

exports.listarTurnos = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT id, nome, entrada_inicio, entrada_fim, intervalo_inicio, intervalo_fim 
            FROM turnos 
            ORDER BY id ASC
        `);
        res.status(200).json({ sucesso: true, turnos: result.rows });
    } catch (error) {
        console.error('Erro ao buscar turnos:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao buscar turnos.' });
    }
};

exports.listarModelosAtivos = async (req, res) => {
    try {
        const { marca_id, setor_id } = req.query;

        let query = 'SELECT id, nome, marca, id_setor_fk FROM modelo WHERE ativo = true';
        let values = [];
        let paramIndex = 1;

        if (marca_id) {
            query += ` AND marca = $${paramIndex}`;
            values.push(marca_id);
            paramIndex++;
        }

        if (setor_id) {
            query += ` AND id_setor_fk = $${paramIndex}`;
            values.push(setor_id);
            paramIndex++;
        }

        query += ' ORDER BY nome ASC';

        const result = await db.query(query, values);
        res.status(200).json({ sucesso: true, modelos: result.rows });
        
    } catch (error) {
        console.error('Erro ao buscar modelos ativos:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao buscar modelos.' });
    }
};
