// routes/usuarios.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // Seu pool de conexões
const bcrypt = require('bcrypt');
const autorizar = require('../middlewares/auth');

router.post('/', autorizar(['admin']), async (req, res) => {
    const { nome, senha, email, celula, turno, cracha, nivelusuario, funcao } = req.body;

    // Validação
    if (!nome || !senha || !email) {
        return res.status(400).json({ sucesso: false, mensagem: 'Nome, email e senha são obrigatórios.' });
    }


    // --- INÍCIO DA DEPURAÇÃO ---
    console.log('--- Iniciando processo de criação de usuário ---');
    console.log('1. Dados recebidos:', { nome, email, senha: '[SENHA OCULTA]' }); // Não mostre a senha real no log por segurança
    
    try {
        const userExists = await db.query('SELECT id FROM usuarios WHERE nome = $1', [nome]);
        if (userExists.rows.length > 0) {
            return res.status(409).json({ sucesso: false, mensagem: 'Este nome de usuário já está em uso.' });
        }
        

        const saltRounds = 10;
        const hashSenha = await bcrypt.hash(senha, saltRounds);
        
        console.log('2. Hash da senha gerado:', hashSenha); // Verifique se o hash foi criado

        // CORREÇÃO PRINCIPAL: A ORDEM DOS VALORES PRECISA CORRESPONDER À ORDEM DAS COLUNAS
        const sql = 'INSERT INTO usuarios (nome, senha, email, turno, setor, "codBar", ativo, funcao ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, nome, email';
        
        // A ordem deve ser: [nome, hashSenha, email] para corresponder a ($1, $2, $3)
        const valores = [nome, hashSenha, email, turno, celula, cracha, nivelusuario, funcao];

        console.log('3. Query a ser executada:', sql);
        console.log('4. Valores a serem inseridos:', valores);

        const resultado = await db.query(sql, valores);
        const novoUsuario = resultado.rows[0];

        console.log('5. Usuário criado com sucesso no banco:', novoUsuario);
        
        res.status(201).json({ 
            sucesso: true, 
            mensagem: 'Usuário criado com sucesso!', 
            usuario: novoUsuario 
        });

    } catch (error) {
        console.error('ERRO DETALHADO ao criar usuário:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    }
});

module.exports = router;

