const express = require('express');
const router = express.Router();

// Importa apenas o controller
const submissoesController = require('../controllers/SubmissoesController');
const autorizar = require('../middlewares/auth');

// Rota GET /api/submissoes/ (Listagem Pública)
router.get('/', autorizar(), submissoesController.listarSubmissoes);

// Rota GET /api/submissoes/:id (Detalhes Públicos)
// routes/SubmissoesRoutes.js
router.get('/:id', autorizar(), submissoesController.buscarDetalhesSubmissao);

module.exports = router;
