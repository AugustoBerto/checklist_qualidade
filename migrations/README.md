# Instalação inicial da VPS

Esta pasta contém somente a migration para uma instalação nova do Checklist.
Ela não cria nem modifica `autenticacao` ou o `dass_auth`, que são serviços
externos obrigatórios.

1. Crie o banco PostgreSQL e conceda ao usuário configurado no Checklist permissão
   para criar o schema `checklist_app`.
2. Configure `JWT_SECRET` igual ao do `dass_auth` e defina
   `CHECKLIST_INITIAL_ADMIN_MATRICULA` antes de iniciar a API.
3. Execute uma única vez:

   ```bash
   psql -v ON_ERROR_STOP=1 -f migrations/001_initial_schema.sql
   ```

4. No primeiro acesso autenticado, a matrícula configurada cria o único perfil
   `ADMIN` inicial. Os demais usuários precisam ser liberados pelo CRUD de perfis.

Não execute migrations antigas de backfill, seed ou remoção usadas no banco local
de teste; elas não fazem parte da implantação da VPS.
