const express = require('express');
const router = express.Router();
const autenticarToken = require('../middlewares/auth');
const pool = require('../db');
//router.get('/', autenticarToken, async (req, res) => {
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome FROM modelo')
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ erro: 'Erro ao buscar usuários' })
  }
});
router.get('/marcas', async (req, res) => {
  try {
    // Busca id e nome da tabela marcas
    const result = await pool.query('SELECT id, nome FROM marcas ORDER BY nome ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar marcas:', error);
    res.status(500).json({ erro: 'Erro ao buscar marcas' });
  }
});

// --- ROTA 2: Busca os MODELOS (filtrando pela marca) ---
// GET /api/modelos?marca_id=1
router.get('/modelos', async (req, res) => {
  try {
    const { marca_id } = req.query; // Pega o parametro da URL

    let query = 'SELECT id, nome FROM modelo';
    let values = [];

    // Se veio um ID de marca, adiciona o WHERE
    if (marca_id) {
      // ATENÇÃO: Verifique se o nome da coluna no banco é 'marca' ou 'marca_id'
      // Baseado na sua descrição "marca(id)", assumi que a coluna se chama 'marca'
      // Busca somente modelos ativos no sistema, permitindo a desativação e não exclusão dos mesmos
      query += ' WHERE marca = $1 AND ativo = true'; 
      values.push(marca_id);
    }

    query += ' ORDER BY nome ASC';

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar modelos:', error);
    res.status(500).json({ erro: 'Erro ao buscar modelos' });
  }
});
module.exports = router;
