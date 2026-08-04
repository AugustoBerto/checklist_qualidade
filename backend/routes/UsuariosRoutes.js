const express = require('express');
const router = express.Router();
const autorizar = require('../middlewares/auth');
const usuariosController = require('../controllers/UsuariosController');

// Rotas existentes...
router.get('/', autorizar('admin'), usuariosController.listarUsuarios);
router.post('/', autorizar('admin'), usuariosController.criarUsuario);
router.put('/:id', autorizar('admin'), usuariosController.editarUsuario);
router.delete('/:id', autorizar('admin'), usuariosController.deletarUsuario); // Você pode remover essa se for usar apenas a inativação!

// NOVAS ROTAS DE STATUS:
// Rota: PATCH /api/usuarios/:id/inativar
router.patch('/:id/inativar', autorizar('admin'), usuariosController.inativarUsuario);

// Rota: PATCH /api/usuarios/:id/reativar
// Necessita enviar { "novoNivel": 1 ou 2 } no corpo da requisição
router.patch('/:id/reativar', autorizar('admin'), usuariosController.reativarUsuario);

module.exports = router;