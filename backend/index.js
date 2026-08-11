require('dotenv').config(); // Sempre bom ter para ler seu .env
const express = require('express');
const cors = require('cors');

const app = express();
const host = process.env.HOST || 'localhost';
const port = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET é obrigatório para validar tokens do dass_auth.');
}

// ==========================================
// 1. MIDDLEWARES GLOBAIS
// ==========================================
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' })); // Limite alto para suportar assinaturas e fotos em Base64
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/api/health', async (req, res) => {
  try {
    await require('./db').query('SELECT 1');
    res.status(200).json({ status: 'ok', database: 'up' });
  } catch (error) {
    res.status(503).json({ status: 'degraded', database: 'down' });
  }
});

// ==========================================
// 2. IMPORTAÇÃO DAS ROTAS
// ==========================================
const CadastrosRoutes = require('./routes/CadastrosRoutes');
const ChecklistRoutes = require('./routes/ChecklistRoutes');
const DadosRoutes = require('./routes/DadosRoutes');
const RelatoriosRoutes = require('./routes/RelatoriosRoutes');
const SubmissoesRoutes = require('./routes/SubmissoesRoutes');
const PerfisRoutes = require('./routes/PerfisRoutes');

// ==========================================
// 3. REGISTRO DOS ENDPOINTS
// ==========================================

// -> Cadastros (Criação e Gestão de Modelos de Checklists)
app.use('/api/cadastros', CadastrosRoutes);

// -> Checklists (Busca de perguntas para preencher e salvamento de respostas)
app.use('/api/checklists', ChecklistRoutes);

// -> Dados Auxiliares (Listas para selects: Marcas, Modelos Ativos, Usuários)
app.use('/api/dados', DadosRoutes);

// -> Relatórios de auditoria
app.use('/api/relatorios', RelatoriosRoutes);

// -> Submissões (Visualização Pública/Histórico de Checklists preenchidos com fotos)
app.use('/api/submissoes', SubmissoesRoutes);

// -> Perfis operacionais vinculados à matrícula do dass_auth
app.use('/api/perfis', PerfisRoutes);


// ==========================================
// 4. TRATAMENTO DE ROTA NÃO ENCONTRADA
// ==========================================
app.use((req, res, next) => {
  res.status(404).json({ sucesso: false, mensagem: 'Endpoint não encontrado na API.' });
});
// ==========================================
// 5. INICIA O SERVIDOR
// ==========================================
app.listen(port, host, () => {
  console.log(`Servidor rodando com sucesso em http://${host}:${port}`);
});
