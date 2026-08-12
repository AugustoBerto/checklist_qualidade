# Banco de dados e migrations

Estas migrations pertencem somente ao Checklist. Elas não criam nem alteram o
`dass_auth` nem o banco de autenticação.

## VPS nova (banco sem objetos do Checklist)

1. Crie um banco PostgreSQL vazio e um usuário com permissão para criar objetos
   nesse banco. Preencha `backend/.env` a partir de `backend/.env.example` com
   os dados desse banco. Na VPS, use `HOST=0.0.0.0`, configure
   `DASS_COLABORADOR_BASE_URL` com o IP/porta do `dass_auth` e ajuste
   `FRONTEND_ORIGIN` para a origem pública do frontend.
2. Configure `JWT_SECRET` com o mesmo valor do `dass_auth` e defina
   `CHECKLIST_INITIAL_ADMIN_MATRICULA` antes de iniciar a API.
3. Na raiz de `checklistApp`, carregue o `.env` e execute **somente** o esquema
   inicial:

   ```bash
   set -a
   . backend/.env
   set +a
   PGPASSWORD="$DB_PASSWORD" psql --no-password -v ON_ERROR_STOP=1 \
     -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_DATABASE" \
     -f migrations/001_initial_schema.sql
   ```

   O schema inicial já inclui a coluna `snapshot` das submissões.
4. Inicie a API. No primeiro acesso autenticado, a matrícula configurada cria o
   único perfil `ADMIN` inicial; os demais perfis são cadastrados pela área
   administrativa.

## Arquivos legados

`001_create_checklist_app.sql`, `002_create_checklist_app_views.sql` e
`003_add_checklist_app_constraints.sql` são exportações históricas do banco
anterior. Não fazem parte da instalação suportada da VPS.
