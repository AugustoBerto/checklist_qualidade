const express = require('express');
const router = express.Router();

const dashboardController = require('../controllers/DashboardController');
const autorizar = require('../middlewares/auth');

router.get('/metricas', autorizar(), dashboardController.obterMetricas);

module.exports = router;
