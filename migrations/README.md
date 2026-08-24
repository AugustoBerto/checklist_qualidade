# Banco de dados e migrations

Estas migrations pertencem somente ao Checklist. Elas não criam nem alteram o
`dass_auth` nem o banco de autenticação.

## VPS nova (banco sem objetos do Checklist)

1. Crie um banco PostgreSQL vazio e um usuário com permissão para criar objetos
   nesse banco. Preencha `backend/.env` a partir de `backend/.env.example` com
   os dados desse banco. Na VPS, use `HOST=0.0.0.0`, configure
   `DASS_AUTH_BASE_URL` com o IP/porta do `dass_auth` e ajuste
   `FRONTEND_ORIGIN` para a origem pública do frontend.
2. Defina `CHECKLIST_INITIAL_ADMIN_MATRICULA` antes de iniciar a API. O
   Checklist valida a sessão pelo contrato existente `POST /auth/me`; ele não
   lê nem compartilha a chave JWT do serviço central.
3. Na raiz de `checklistApp`, carregue o `.env` e inicialize o banco pelo
   executor DBF:

   ```bash
   set -a
   . backend/.env
   set +a
   cd backend
   npm run db:init
   npm run db:migrate
   npm run db:status
   ```

   `db:init` recusa continuar se `DB_SCHEMA` já existir. Ele aplica somente a
   migration inicial, registra seu SHA-256 em `schema_migrations` e não revela
   valores de conexão. `db:migrate` aplica apenas migrations suportadas futuras
   (versão `005` ou superior), em ordem e dentro de transação. `db:status` é
   somente leitura.
4. Inicie a API. No primeiro acesso autenticado, a matrícula configurada cria o
   único perfil `ADMIN` inicial; os demais perfis são cadastrados pela área
   administrativa.

## Arquivos legados

`001_create_checklist_app.sql`, `002_create_checklist_app_views.sql` e
`003_add_checklist_app_constraints.sql` são exportações históricas do banco
anterior. Não fazem parte da instalação suportada da VPS.

Os arquivos `002_create_checklist_app_views.sql`,
`003_add_checklist_app_constraints.sql` e `004_normalize_brand_and_submission_sector.sql`
permanecem preservados para instalações legadas, mas não são descobertos pelo
executor DBF. A versão `004` continua sendo aplicada manualmente conforme a
seção de atualização abaixo; migrations gerenciadas pelo DBF começam em `005`.

## PostgreSQL descartável para integração

O arquivo `backend/docker-compose.db-test.yml` inicia PostgreSQL 15 com dados
em `tmpfs`, portanto o banco é descartável ao executar `docker compose down`.
Os valores desse compose são exclusivos de teste local. Para executar a
fundação:

```bash
cd backend
npm run test:integration
```

O comando valida que o banco termina em `_test`, sobe o Compose com nome de
projeto isolado e sempre executa `down -v` ao final, inclusive quando um teste
falha. `npm run test:all` combina a suíte unitária com essa integração.

O reset destrutivo não faz parte dos scripts de produção. Qualquer operação de
reset de testes deve usar exclusivamente um banco cujo nome termine em
`_test`.

## Atualização de uma instalação existente

Antes da atualização, restaure um backup em homologação e execute o preflight:

```sql
SELECT count(*) AS setores_orfaos
FROM checklist_app.formulario_submissoes fs
LEFT JOIN checklist_app.setores s ON s.id = fs.id_setor
WHERE fs.id_setor IS NOT NULL AND s.id IS NULL;

SELECT m.id, m.nome, count(DISTINCT ma.id) AS correspondencias
FROM checklist_app.modelo m
LEFT JOIN checklist_app.marcas ma
  ON trim(m.marca) = ma.id::text
  OR upper(trim(m.marca)) = upper(trim(ma.nome))
GROUP BY m.id, m.nome
HAVING count(DISTINCT ma.id) <> 1;
```

Com os resultados revisados, aplique `004_normalize_brand_and_submission_sector.sql`
com `psql --no-password -v ON_ERROR_STOP=1`. A migration não altera a coluna
textual `modelo.marca`, não preenche setores ausentes e não fabrica snapshots
para submissões antigas. Associações de marca ambíguas permanecem com FK nula.
Esta migration deve ser aplicada **antes** de publicar a versão da API que usa
`modelo.id_marca_fk`; inverter essa ordem interrompe criação e consulta de
modelos e relatórios.

O rollback da aplicação deve voltar primeiro para a versão anterior. As novas
colunas podem permanecer, pois são compatíveis e anuláveis. Não remova colunas,
snapshots ou dados históricos como parte do rollback operacional.
