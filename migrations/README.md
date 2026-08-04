# Migrations do checklistApp

As migrations SQL deste diretório criam os objetos da aplicação no schema
`checklist_app`. Execute os arquivos em ordem crescente no banco de destino.

Em desenvolvimento:

```sh
psql --host=localhost --port=5432 --username=postgres --dbname=postgres \
  --set=ON_ERROR_STOP=1 --file=migrations/001_create_checklist_app.sql
psql --host=localhost --port=5432 --username=postgres --dbname=postgres \
  --set=ON_ERROR_STOP=1 --file=migrations/002_create_checklist_app_views.sql
psql --host=localhost --port=5432 --username=postgres --dbname=postgres \
  --set=ON_ERROR_STOP=1 --file=migrations/003_add_checklist_app_constraints.sql
```

As credenciais não fazem parte das migrations. Forneça a senha pelo mecanismo
seguro usado no ambiente (por exemplo, prompt do `psql` ou arquivo `.pgpass`).

O dump de origem não contém comandos de carga de dados. Por isso, estas
migrations criam apenas estrutura, views e constraints, com sequências novas
iniciando no valor padrão.

Configure o backend com `DB_SCHEMA=checklist_app`. A conexão define esse schema
como `search_path` da sessão, mantendo as consultas da aplicação isoladas dos
demais schemas do banco.
