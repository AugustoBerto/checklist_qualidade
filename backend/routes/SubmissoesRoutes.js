const express = require('express');
const router = express.Router();

// Importa apenas o controller
const submissoesController = require('../controllers/SubmissoesController');

// Rota GET /api/submissoes/ (Listagem Pública)
router.get('/', submissoesController.listarSubmissoes);

// Rota GET /api/submissoes/:id (Detalhes Públicos)
// routes/SubmissoesRoutes.js
router.get('/:id', submissoesController.buscarDetalhesSubmissao); // O nome deve ser IDÊNTICO

module.exports = router;