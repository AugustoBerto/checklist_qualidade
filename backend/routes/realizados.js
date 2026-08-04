const express = require('express');
const router = express.Router();
const db = require('../db'); // Seu pool de conexões do PostgreSQL

router.get('/', async (req, res) => {
    try {
        const Formularios = `
            SELECT
        data_envio,
        COUNT(*) AS total_de_submissoes
    FROM 
        formulario_submissoes 
    GROUP BY 
        data_envio
    ORDER BY
        data_envio;
        `;
        const resultados = await db.query(Formularios);

        res.json({
            sucesso: true,
            dados: resultados
        });

    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    }
});

module.exports = router;