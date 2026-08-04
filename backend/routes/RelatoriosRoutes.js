const express = require('express');
const router = express.Router();
const autorizar = require('../middlewares/auth');
const relatoriosController = require('../controllers/RelatoriosController');

// Rota: GET /api/relatorios/metricas/top-nao-conformes
router.get('/metricas/top-nao-conformes', autorizar(), relatoriosController.buscarTop3NaoConformidades);

// Rota: GET /api/relatorios/:id
router.get('/:id', autorizar(), relatoriosController.buscarRelatorioPorId);

// Rota: POST /api/relatorios/:id/enviar-email
// (Note que a URL da rota mudou para incluir a ação 'enviar-email' explícita)
router.post('/:id/enviar-email', autorizar(), relatoriosController.enviarRelatorioPorEmail);

module.exports = router;