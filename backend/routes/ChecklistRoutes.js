const express = require('express');
const router = express.Router();

const autorizar = require('../middlewares/auth');
const checklistController = require('../controllers/ChecklistController');

router.get('/perguntas/:modelo', autorizar(), checklistController.buscarPerguntas);
router.post('/salvar', autorizar(), checklistController.salvarChecklist);

module.exports = router;
