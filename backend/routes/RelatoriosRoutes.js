const express = require('express');
const router = express.Router();
const autorizar = require('../middlewares/auth');
const relatoriosController = require('../controllers/RelatoriosController');

// Rota: GET /api/relatorios/:id
router.get('/:id', autorizar(), relatoriosController.buscarRelatorioPorId);

module.exports = router;
