const express = require('express');
const router = express.Router();
const autenticarToken = require('../middlewares/auth');
const pool = require('../db');
//router.get('/', autenticarToken, async (req, res) => {
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome FROM marcas')
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ erro: 'Erro ao buscar usuários' })
  }
})
module.exports = router;
