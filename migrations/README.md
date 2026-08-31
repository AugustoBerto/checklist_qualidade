# Banco de dados e migrations

Migrations SQL do Checklist. Elas não alteram `dass_auth` nem o banco de
autenticação e são registradas com checksum em `schema_migrations`.

## Inicialização ou atualização

Com `DATABASE_URL`, `JWT_SECRET` e `CHECKLIST_INITIAL_ADMIN_MATRICULA`
configurados em `backend/.env`:

```bash
cd backend
npm run db:init
npm run db:migrate
npm run db:status
```

`db:init` cria o schema `checklist_app` e aplica a estrutura inicial;
`db:migrate` executa apenas as versões pendentes. Não altere migrations já
aplicadas: o runner valida seus checksums.

## Teste de integração

```bash
cd backend
npm run test:integration
```

O comando usa o PostgreSQL temporário de `backend/docker-compose.db-test.yml`.
