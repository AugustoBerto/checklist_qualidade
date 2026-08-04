const express = require('express');
const router = express.Router();

// Importa o middleware de segurança e o controller
const autorizar = require('../middlewares/auth');
const CadastrosController = require('../controllers/CadastrosController');

// ==========================================
// ROTAS DE MODELOS (Checklists Base)
// ==========================================

// Criar um novo modelo (Apenas Admin)
// Exemplo: POST /api/cadastros/modelos
router.post('/modelos', autorizar('admin'), CadastrosController.criarModelo);

// Listar todos os modelos para edição (Apenas Admin)
// Exemplo: GET /api/cadastros/modelos
router.get('/modelos', autorizar('admin'), CadastrosController.listarModelos);

// Buscar um modelo específico pelo ID para carregar na tela de edição (Apenas Admin)
// Exemplo: GET /api/cadastros/modelos/5
router.get('/modelos/:id', autorizar('admin'), CadastrosController.buscarModeloPorId);

// Atualizar um modelo existente (Apenas Admin)
// Exemplo: PUT /api/cadastros/modelos/5
router.put('/modelos/:id', autorizar('admin'), CadastrosController.atualizarModelo);

// --- MARCAS ---
// Mantivemos o caminho '/dados/marcas' para não precisar alterar o Vue.js!
router.get('/marcas', CadastrosController.listarMarcas);
router.post('/marcas', CadastrosController.criarMarca);
router.put('/marcas/:id', CadastrosController.atualizarMarca);
router.delete('/marcas/:id', CadastrosController.excluirMarca);

// --- SETORES ---
router.get('/setores', CadastrosController.listarSetores);
router.post('/setores', CadastrosController.criarSetor);
router.put('/setores/:id', CadastrosController.atualizarSetor);
router.delete('/setores/:id', CadastrosController.excluirSetor);

// --- CÉLULAS DE PRODUÇÃO ---
router.get('/celulas', CadastrosController.listarCelulas);
router.post('/celulas', CadastrosController.criarCelula);
router.put('/celulas/:id', CadastrosController.atualizarCelula);
router.delete('/celulas/:id', CadastrosController.excluirCelula);

// --- UNIDADES ---
router.get('/unidades', CadastrosController.listarUnidades);
router.post('/unidades', CadastrosController.criarUnidade);
router.put('/unidades/:id', CadastrosController.atualizarUnidade);
router.delete('/unidades/:id', CadastrosController.excluirUnidade);

router.get('/turnos', CadastrosController.listarTurnos);
router.post('/turnos', CadastrosController.criarTurno);
router.put('/turnos/:id', CadastrosController.atualizarTurno);
router.delete('/turnos/:id', CadastrosController.excluirTurno);

module.exports = router;