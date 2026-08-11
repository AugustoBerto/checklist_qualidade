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
router.get('/marcas', autorizar(), CadastrosController.listarMarcas);
router.post('/marcas', autorizar('ADMIN'), CadastrosController.criarMarca);
router.put('/marcas/:id', autorizar('ADMIN'), CadastrosController.atualizarMarca);
router.delete('/marcas/:id', autorizar('ADMIN'), CadastrosController.excluirMarca);

// --- SETORES ---
router.get('/setores', autorizar(), CadastrosController.listarSetores);
router.post('/setores', autorizar('ADMIN'), CadastrosController.criarSetor);
router.put('/setores/:id', autorizar('ADMIN'), CadastrosController.atualizarSetor);
router.delete('/setores/:id', autorizar('ADMIN'), CadastrosController.excluirSetor);

// --- CÉLULAS DE PRODUÇÃO ---
router.get('/celulas', autorizar(), CadastrosController.listarCelulas);
router.post('/celulas', autorizar('ADMIN'), CadastrosController.criarCelula);
router.put('/celulas/:id', autorizar('ADMIN'), CadastrosController.atualizarCelula);
router.delete('/celulas/:id', autorizar('ADMIN'), CadastrosController.excluirCelula);

// --- UNIDADES ---
router.get('/unidades', autorizar(), CadastrosController.listarUnidades);
router.post('/unidades', autorizar('ADMIN'), CadastrosController.criarUnidade);
router.put('/unidades/:id', autorizar('ADMIN'), CadastrosController.atualizarUnidade);
router.delete('/unidades/:id', autorizar('ADMIN'), CadastrosController.excluirUnidade);

router.get('/turnos', autorizar(), CadastrosController.listarTurnos);
router.post('/turnos', autorizar('ADMIN'), CadastrosController.criarTurno);
router.put('/turnos/:id', autorizar('ADMIN'), CadastrosController.atualizarTurno);
router.delete('/turnos/:id', autorizar('ADMIN'), CadastrosController.excluirTurno);

module.exports = router;
