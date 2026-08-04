// backend/routes/checklist.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // conexão PostgreSQL
const autorizar = require('../middlewares/auth');
const { io } = require('../index');


router.get('/perguntas/:modelo', autorizar(['usuario', 'admin']),async (req, res) => {
  const { modelo } = req.params;
  try {
    const { rows } = await pool.query(`
      SELECT c.id, c.categoria, p.pergunta, p.identificacao, m.nome
      FROM perguntas p
      JOIN modelo m ON p.id_modelo = m.id
      JOIN categorias c ON p.id_categoria = c.id
      WHERE p.id_modelo = $1
      ORDER BY c.id, p.id
    `, [modelo]);

    // Agrupar por categoria
    const agrupado = {};
    rows.forEach(row => {
      if (!agrupado[row.categoria]) agrupado[row.categoria] = [];
      agrupado[row.categoria].push({
        texto: row.pergunta,
        variavel: row.identificacao,
        modelo: row.nome
      });
    });

    res.json({
      respostasAgrupadas : agrupado,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar perguntas' });
  }
});

module.exports = router;
