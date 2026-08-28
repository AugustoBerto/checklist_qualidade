# Desenvolvimento, testes e operação

## Estrutura do repositório

```text
checklist_app/
├── backend/       API, acesso a dados, scripts e testes Node
├── frontend/      SPA Vue, componentes, serviços e testes Vitest
├── migrations/    schema e evoluções SQL
├── docs/          documentação do projeto
└── ecosystem.config.cjs
```

Os diretórios `backend` e `frontend` têm dependências e comandos npm separados.

## Validação local

Backend, sem banco descartável:

```bash
cd backend
npm test
```

Frontend:

```bash
cd frontend
npm test
npm run build
```

Integração com banco:

```bash
cd backend
npm run test:integration
```

O teste de integração sobe `postgres:15-alpine` em `127.0.0.1:55432`, inicializa
e migra um banco cujo nome deve terminar em `_test`, executa os testes e remove
container e volume ao terminar. Isso exige Docker Compose e acesso à imagem.

`npm run test:all` combina testes unitários e integração do backend. Ele não
executa testes nem build do frontend.

## Migrations

Para uma migration nova:

1. crie em `migrations/` um arquivo com versão crescente, por exemplo
   `005_descricao.sql`;
2. escreva SQL dirigido ao schema `checklist_app` (o runner adapta `DB_SCHEMA`);
3. não repita uma versão e não modifique arquivos já aplicados;
4. valide com o banco descartável;
5. em ambientes existentes, execute `npm run db:migrate` e confira
   `npm run db:status`.

Detalhes adicionais estão em [Banco de dados e migrations](../migrations/README.md).

## Retenção de evidências

A API deixa de servir uma evidência seis meses após sua criação. Agende o comando
abaixo no ambiente do backend para remover fisicamente os bytes expirados sem
apagar seus metadados históricos:

```bash
npm run evidencias:cleanup
```

O comando é idempotente e informa quantos conteúdos foram removidos. Preserve
essa saída nos logs do agendador. Consulte [Documentos de checklist e
evidências](DOCUMENTOS_E_EVIDENCIAS.md) para o ciclo de vida completo.

## Diagnóstico

### API não inicia

- confira se `JWT_SECRET` está definido e não usa o valor inseguro bloqueado;
- valide sintaxe e origem do `.env` em `backend/`;
- confirme que a porta configurada está livre.

### Health check degradado

- teste host, porta, banco e credenciais PostgreSQL;
- confira `DATABASE_URL` primeiro, pois ela prevalece sobre variáveis `DB_*`;
- confirme se o schema foi inicializado e se o usuário tem permissão.

### Login funciona, mas o Checklist retorna 403

- confirme se o JWT possui `matricula`;
- confirme perfil local ativo e papel válido;
- no primeiro acesso, confira `CHECKLIST_INITIAL_ADMIN_MATRICULA`;
- para outros usuários, um `ADMIN` deve criar o perfil pela configuração.

### Frontend chama o destino errado

- confira `VITE_APP_BASE_URL`, `VITE_API_URL` e `VITE_GATEWAY_URL`;
- reinicie o Vite após mudar variáveis `VITE_*`;
- confirme o prefixo `/api/checklist-app` no Gateway.

### Cadastro de perfil falha

A criação consulta diretamente `DASS_AUTH_BASE_URL` com timeout de cinco
segundos. Verifique a conectividade e a rota `/colaborador/:matricula` no serviço
central.

## Observabilidade e segurança operacional

- `GET /api/health` é a verificação mínima de disponibilidade.
- Erros internos são registrados no processo da API; respostas não expõem o erro bruto.
- Não registre ou versione `.env`, JWTs, senhas ou refresh tokens.
- Mantenha `JWT_SECRET` sincronizado com o `dass_auth` por um canal seguro.
- Restrinja `FRONTEND_ORIGIN` à origem real do frontend.
- Garanta que Gateway/proxy preserve cookies e cabeçalhos `Set-Cookie`.
- Faça backup do PostgreSQL antes de migrations em ambientes persistentes.
