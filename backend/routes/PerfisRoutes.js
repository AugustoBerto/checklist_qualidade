const express = require('express');
const autorizar = require('../middlewares/auth');
const perfis = require('../controllers/PerfisController');

const router = express.Router();

router.get('/me', autorizar(), perfis.me);
router.get('/', autorizar('ADMIN'), perfis.listar);
router.post('/', autorizar('ADMIN'), perfis.criar);
router.put('/:id', autorizar('ADMIN'), perfis.atualizar);

module.exports = router;
