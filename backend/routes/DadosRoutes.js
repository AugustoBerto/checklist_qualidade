const express = require('express');
const router = express.Router();

// Importa o middleware de autenticação e o novo controller
const autorizar = require('../middlewares/auth');
const dadosController = require('../controllers/DadosController');

// Rota: GET /api/dados/marcas
router.get('/marcas', autorizar(), dadosController.listarMarcas);
router.get('/turnos', autorizar(), dadosController.listarTurnos);
// Rota: GET /api/dados/modelos?marca_id=1
router.get('/modelos', autorizar(), dadosController.listarModelosAtivos);
module.exports = router;
