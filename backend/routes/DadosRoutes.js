const express = require('express');
const router = express.Router();

const autorizar = require('../middlewares/auth');
const dadosController = require('../controllers/DadosController');

router.get('/marcas', autorizar(), dadosController.listarMarcas);
router.get('/turnos', autorizar(), dadosController.listarTurnos);
router.get('/modelos', autorizar(), dadosController.listarModelosAtivos);
module.exports = router;
