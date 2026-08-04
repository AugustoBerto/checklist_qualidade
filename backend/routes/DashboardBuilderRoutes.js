const express = require('express');
const router = express.Router();

const autorizar = require('../middlewares/auth');
const dashboardBuilderController = require('../controllers/DashboardBuilderController');

// ----------------------------------------------------------------------
// ROTAS DE METADADOS E EXTRAÇÃO (Usadas pelo motor do BI)
// ----------------------------------------------------------------------
router.get('/fontes', autorizar('admin'), dashboardBuilderController.listarFontesDeDados);
router.get('/colunas/:fonte', autorizar('admin'), dashboardBuilderController.listarColunasPorFonte);
router.post('/extrair', autorizar('admin'), dashboardBuilderController.extrairDados);

// ----------------------------------------------------------------------
// ROTAS DE CRUD (Salvar, Listar, Editar e Excluir Configurações)
// ----------------------------------------------------------------------
router.post('/salvar', autorizar('admin'), dashboardBuilderController.salvarDashboard);
router.get('/listar', autorizar('admin'), dashboardBuilderController.listarDashboards);
router.get('/carregar/:id', autorizar('admin'), dashboardBuilderController.carregarDashboard);
router.put('/editar/:id', autorizar('admin'), dashboardBuilderController.editarDashboard);
router.delete('/excluir/:id', autorizar('admin'), dashboardBuilderController.excluirDashboard);

module.exports = router;