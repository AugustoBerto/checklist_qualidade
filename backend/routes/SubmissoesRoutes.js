const express = require('express');
const router = express.Router();

const submissoesController = require('../controllers/SubmissoesController');
const autorizar = require('../middlewares/auth');

router.get('/', autorizar(), submissoesController.listarSubmissoes);
router.get('/:id', autorizar(), submissoesController.buscarDetalhesSubmissao);

module.exports = router;
