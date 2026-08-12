const express = require('express');
const router = express.Router();
const autorizar = require('../middlewares/auth');
const relatoriosController = require('../controllers/RelatoriosController');

router.get('/:id', autorizar(), relatoriosController.buscarRelatorioPorId);

module.exports = router;
