// routes/usuarios.js
const express = require('express')
const router = express.Router()
const pool = require('../db')

// Buscar todos os usuários
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM usuarios')
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ erro: 'Erro ao buscar usuários' })
  }
})

// Inserir um novo usuário
router.post('/', async (req, res) => {
  const { nome, email } = req.body
  try {
    const result = await pool.query(
      'INSERT INTO usuarios (nome, email) VALUES ($1, $2) RETURNING *',
      [nome, email]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ erro: 'Erro ao inserir usuário' })
  }
})

module.exports = router
