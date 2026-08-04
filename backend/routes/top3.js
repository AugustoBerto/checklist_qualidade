// routes/metricas.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // Seu pool de conexões do PostgreSQL

// Rota para buscar o Top 3 de não conformidades
// GET /api/metricas/top3-nao-conforme
router.get('/', async (req, res) => {
    try {
        const sqlTop3 = `
            SELECT
                nome_categoria,
                nome_pergunta,
                COUNT(*) as total_nao_conforme
            FROM
                formulario
            WHERE
                resposta = 'Não Conforme'
            GROUP BY
                nome_categoria,
                nome_pergunta
            ORDER BY
                total_nao_conforme DESC
            LIMIT 3;
        `;
        const resultadoTop3 = await db.query(sqlTop3);
        
        res.json({
            sucesso: true,
            dados: resultadoTop3.rows
        });

    } catch (error) {
        console.error('Erro ao buscar o Top 3 de não conformidades:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    }
});

module.exports = router;