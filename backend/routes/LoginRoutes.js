const express = require('express');
const router = express.Router();

const loginController = require('../controllers/LoginController');
// Rota para login padrão (usuário e senha)
// Exemplo de requisição: POST localhost:3000/login/admin
// Exemplo de requisição: POST localhost:3000/login/usuario
router.post('/:tipo', loginController.LoginUser);

// Rota para login via Código de Barras (Crachá)
// Exemplo de requisição: POST localhost:3000/login/codbar/admin
// Exemplo de requisição: POST localhost:3000/login/codbar/usuario
router.post('/codbar/:tipo', loginController.LoginUserCodBar);

module.exports = router;