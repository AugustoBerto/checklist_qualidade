const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'segredo_super_secreto';

router.post('/', async (req, res) => {
  const { usuario, senha } = req.body;
  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE nome = $1', [usuario]);
    if (result.rows.length === 0)
      return res.status(401).json({ sucesso: false, mensagem: 'Usuário ou senha inválidos.' });

    const user = result.rows[0];
    const senhaCorreta = await bcrypt.compare(senha, user.senha);
    if (!senhaCorreta)
      return res.status(401).json({ sucesso: false, mensagem: 'Usuário ou senha inválidos.' });

    const payload = {
      id: user.id,
      nome: user.nome,
      permissao: 'usuario' // Adiciona a permissão 'admin' ao conteúdo do token
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    res.json({ sucesso: true, token, nome: user.nome, admin: false });
  } catch (error) {
    console.error(error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro no servidor.' });
  }
});

module.exports = router;
