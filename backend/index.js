require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const host = process.env.HOST || 'localhost';
const port = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET é obrigatório para validar tokens do dass_auth.');
}
if (process.env.JWT_SECRET === 'supersecretjwtkey12345') {
  throw new Error('JWT_SECRET não pode usar o valor padrão do exemplo.');
}

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '12mb', strict: false }));
app.use(express.urlencoded({ limit: '12mb', extended: true }));
app.use((req, res, next) => {
  if (req.body === null) req.body = {};
  if (req.body !== undefined && typeof req.body !== 'object') {
    return res.status(400).json({ sucesso: false, mensagem: 'JSON inválido.' });
  }
  next();
});

app.get('/api/health', async (req, res) => {
  try {
    await require('./db').query('SELECT 1');
    res.status(200).json({ status: 'ok', database: 'up' });
  } catch (error) {
    res.status(503).json({ status: 'degraded', database: 'down' });
  }
});

const CadastrosRoutes = require('./routes/CadastrosRoutes');
const ChecklistRoutes = require('./routes/ChecklistRoutes');
const DadosRoutes = require('./routes/DadosRoutes');
const RelatoriosRoutes = require('./routes/RelatoriosRoutes');
const SubmissoesRoutes = require('./routes/SubmissoesRoutes');
const PerfisRoutes = require('./routes/PerfisRoutes');

app.use('/api/cadastros', CadastrosRoutes);
app.use('/api/checklists', ChecklistRoutes);
app.use('/api/dados', DadosRoutes);
app.use('/api/relatorios', RelatoriosRoutes);
app.use('/api/submissoes', SubmissoesRoutes);
app.use('/api/perfis', PerfisRoutes);

if (process.env.NODE_ENV === 'test') {
  app.get('/api/test/error', (_req, _res, next) => next(new Error('erro de teste')));
}

app.use((req, res, next) => {
  res.status(404).json({ sucesso: false, mensagem: 'Endpoint não encontrado na API.' });
});
app.use((error, _req, res, next) => {
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ sucesso: false, mensagem: 'A solicitação excede o limite de 12 MB.' });
  }
  if (error instanceof SyntaxError && error.status === 400) {
    return res.status(400).json({ sucesso: false, mensagem: 'JSON inválido.' });
  }
  console.error(error);
  return res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
});

module.exports = app;

if (require.main === module) {
  app.listen(port, host, () => {
    console.log(`Servidor rodando com sucesso em http://${host}:${port}`);
  });
}
