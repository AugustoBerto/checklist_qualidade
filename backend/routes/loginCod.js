const express = require('express');
const router = express.Router();
const pool = require('../db'); // Seu pool de conexões
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'segredo_super_secreto';

router.post('/', async (req, res) => {
  const { codBar } = req.body;

  if (!codBar) {
    return res.status(400).json({ sucesso: false, mensagem: 'Código de barras não fornecido.' });
  }

  try {
    // --- CORREÇÃO APLICADA AQUI ---
    // Usamos aspas duplas em "codBar" para respeitar as letras maiúsculas
    const sql = 'SELECT * FROM usuarios WHERE "codBar" = $1';

    const result = await pool.query(sql, [codBar]);

    if (result.rows.length === 0) {
      return res.status(401).json({ sucesso: false, mensagem: 'Crachá não encontrado.' });
    }

    const user = result.rows[0];

    // Se encontrou o usuário, gera o token e faz o login
    const payload = {
      id: user.id,
      nome: user.nome,
      permissao: 'usuario' // Adiciona a permissão 'admin' ao conteúdo do token
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    res.json({ sucesso: true, token, nome: user.nome, admin: false });

  } catch (error) {
    console.error('Erro no login com código de barras:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro no servidor.' });
  }
});

module.exports = router;