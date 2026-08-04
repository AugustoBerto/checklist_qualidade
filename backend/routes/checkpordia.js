// routes/metricas.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// ... (sua rota existente /top3-nao-conforme) ...

// NOVA ROTA: GET /api/metricas/checklists-por-dia
router.get('/', async (req, res) => {
    try {
        // Query para contar as submissões dos últimos 7 dias
        const sql = `
            SELECT 
                DATE(data_envio)::date AS dia, 
                COUNT(*) AS total
            FROM 
                formulario_submissoes
            WHERE 
                data_envio >= CURRENT_DATE - INTERVAL '6 days'
            GROUP BY 
                dia
            ORDER BY 
                dia ASC;
        `;
        const resultado = await db.query(sql);

        // Formata os dados no formato { labels: [...], data: [...] }
        const labels = resultado.rows.map(row => 
            new Date(row.dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        );
        const data = resultado.rows.map(row => parseInt(row.total, 10));

        res.json({ sucesso: true, labels, data });

    } catch (error) {
        console.error('Erro ao buscar dados de checklists por dia:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    }
});

module.exports = router;