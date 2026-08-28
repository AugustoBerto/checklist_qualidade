# Banco de dados e migrations

Estas migrations pertencem somente ao Checklist. Elas não criam nem alteram o
`dass_auth` nem o banco de autenticação.

## Nova Instalação / Nova Máquina (Banco Limpo)

O sistema conta com uma migration consolidada principal: `001_initial_schema.sql`.
Ela cria toda a estrutura de tabelas, relacionamentos, chaves estrangeiras e índices necessários para a operação completa do Checklist.

1. Crie um banco PostgreSQL vazio e preencha `backend/.env` a partir de `backend/.env.example` com os dados de conexão.
2. Defina `JWT_SECRET` e `CHECKLIST_INITIAL_ADMIN_MATRICULA`.
3. Inicialize o banco executando os comandos a partir de `checklistApp/backend`:

   ```bash
   cd backend
   npm run db:init
   npm run db:migrate
   npm run db:status
   ```

   - `db:init`: Cria o schema configurado (`checklist_app`), executa `001_initial_schema.sql` e registra em `schema_migrations`.
   - `db:migrate`: Executa as migrations posteriores à estrutura inicial.
   - `db:status`: Exibe o estado e histórico de migrations aplicadas.

   A migration `005_modelo_versao_assinatura_mime.sql` adiciona controle
   otimista de versão aos modelos e preserva o tipo real das assinaturas. Não
   altere migrations já aplicadas: o runner valida seus checksums.

   A migration `006_formulario_evidencias.sql` separa fotos das respostas,
   registra MIME, tamanho, criação, expiração em seis meses e eventual remoção.
   O prazo controla a disponibilidade na API; a limpeza física do conteúdo deve
   ser feita por tarefa operacional agendada e auditável.

4. Inicie a API (`npm run dev` ou `npm start`). No primeiro login autenticado com a matrícula de administrador, o perfil `ADMIN` será criado automaticamente.

## Testes de Integração com Banco Descartável

O arquivo `backend/docker-compose.db-test.yml` fornece um PostgreSQL 15 temporário para execução de testes automatizados:

```bash
cd backend
npm run test:integration
```
