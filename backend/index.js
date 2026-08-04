require('dotenv').config(); // Sempre bom ter para ler seu .env
const express = require('express');
const cors = require('cors');
const http = require('http');

const app = express();
const port = process.env.PORT || 3000;

// ==========================================
// 1. CONFIGURAÇÃO DO SERVIDOR E WEBSOCKETS
// ==========================================
const server = http.createServer(app);

// Inicializa o socket.io usando o seu arquivo socket.js
const io = require('./socket').init(server);

// Gerenciamento de conexões do Socket.io centralizado aqui (ou dentro do próprio socket.js)
io.on('connection', (socket) => {
  console.log('Um usuário se conectou via WebSocket:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Usuário desconectado:', socket.id);
  });
});

// Exporta o io caso precise dele em arquivos que chamam direto do index
module.exports.io = io; 

// ==========================================
// 2. MIDDLEWARES GLOBAIS
// ==========================================
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Limite alto para suportar assinaturas e fotos em Base64
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ==========================================
// 3. IMPORTAÇÃO DAS ROTAS REFATORADAS
// ==========================================
const LoginRoutes = require('./routes/LoginRoutes');
const CadastrosRoutes = require('./routes/CadastrosRoutes');
const ChecklistRoutes = require('./routes/ChecklistRoutes');
const DadosRoutes = require('./routes/DadosRoutes');
const DashboardBuilderRoutes = require('./routes/DashboardBuilderRoutes');
const RelatoriosRoutes = require('./routes/RelatoriosRoutes');
const SubmissoesRoutes = require('./routes/SubmissoesRoutes');
const UsuariosRoutes = require('./routes/UsuariosRoutes');

// ==========================================
// 4. REGISTRO DOS ENDPOINTS (Rotas)
// ==========================================

// -> Login (Engloba senha, código de barras, admin e usuário)
app.use('/api/login', LoginRoutes);

// -> Cadastros (Criação e Gestão de Modelos de Checklists)
app.use('/api/cadastros', CadastrosRoutes);

// -> Checklists (Busca de perguntas para preencher e salvamento de respostas)
app.use('/api/checklists', ChecklistRoutes);

// -> Dados Auxiliares (Listas para selects: Marcas, Modelos Ativos, Usuários)
app.use('/api/dados', DadosRoutes);

// -> Construtor de Dashboards Dinâmico (BI Engine)
app.use('/api/dashboard-builder', DashboardBuilderRoutes);

// -> Relatórios e Dashboards Nativos (Top 3, Análise de Usuário, Gráficos, Envio de E-mail)
app.use('/api/relatorios', RelatoriosRoutes);

// -> Submissões (Visualização Pública/Histórico de Checklists preenchidos com fotos)
app.use('/api/submissoes', SubmissoesRoutes);

// -> Gestão de Usuários (CRUD de usuários, Inativação e Reativação)
app.use('/api/usuarios', UsuariosRoutes);


// Serviços de email
const relatorioEmailService = require('./services/relatorioEmailService'); // Ajuste o caminho se necessário

// ROTA TEMPORÁRIA DE TESTE DO PUSH B.I.
app.get('/api/teste-email', async (req, res) => {
  console.log('Disparando e-mail gerencial manualmente via rota de teste...');
  // Chama a função imediatamente sem esperar o relógio
  relatorioEmailService.enviarResumoDiarioGestores(); 
  res.json({ sucesso: true, mensagem: 'Disparo iniciado em background. Verifique o console do Node!' });
});

// ROTA TEMPORÁRIA DE TESTE DO RELATÓRIO SEMANAL B.I.
app.get('/api/teste-email-semanal', async (req, res) => {
  console.log('Disparando e-mail semanal manualmente via rota de teste...');
  
  // Chama a função imediatamente em background (não trava a requisição HTTP)
  // Certifique-se de que o objeto/serviço chamado aqui corresponde a onde a função foi exportada
  relatorioEmailService.enviarResumoSemanalGestores(); 
  
  res.json({ 
    sucesso: true, 
    mensagem: 'Disparo do e-mail semanal iniciado em background. Verifique o console do Node para acompanhar o log!' 
  });
});

// ==========================================
// 5. TRATAMENTO DE ROTA NÃO ENCONTRADA (Fallback 404)
// ==========================================
app.use((req, res, next) => {
  res.status(404).json({ sucesso: false, mensagem: 'Endpoint não encontrado na API.' });
});
relatorioEmailService.iniciarAgendador();
// ==========================================
// 6. INICIA O SERVIDOR
// ==========================================
server.listen(port, () => {
  console.log(`Servidor rodando com sucesso em http://localhost:${port}`);
  console.log(`WebSocket ativo aguardando conexões...`);
});