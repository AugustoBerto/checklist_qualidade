const express = require('express');
const router = express.Router();

const autorizar = require('../middlewares/auth');
const checklistController = require('../controllers/ChecklistController');

// Rota: GET /api/checklists/perguntas/1
// Puxa as perguntas do banco para o usuário preencher (Qualquer logado)
router.get('/perguntas/:modelo', autorizar(), checklistController.buscarPerguntas);

// Rota: POST /api/checklists/salvar
// Salva o checklist completo e emite o evento de socket (Qualquer logado)
router.post('/salvar', autorizar(), checklistController.salvarChecklist);

module.exports = router;