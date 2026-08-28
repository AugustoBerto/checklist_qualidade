# Desenvolvimento, testes e operação

## Estrutura do repositório

```text
checklist_app/
├── backend/       API, acesso a dados, scripts, testes Node e configuração PM2
├── frontend/      SPA Vue, componentes, serviços e testes Vitest
├── migrations/    schema e evoluções SQL
└── docs/          documentação do projeto
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
2. escreva SQL dirigido ao schema fixo `checklist_app`;
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
- confira formato, host, porta, banco e credenciais de `DATABASE_URL`;
- confirme se o schema foi inicializado e se o usuário tem permissão.

### Login funciona, mas o Checklist retorna 403

- confirme se o JWT possui `matricula`;
- confirme perfil local ativo e papel válido;
- no primeiro acesso, confira `CHECKLIST_INITIAL_ADMIN_MATRICULA`;
- para outros usuários, confirme se um `ADMIN` cadastrou previamente a matrícula e manteve o perfil ativo.

### Frontend chama o destino errado

- confira `VITE_APP_BASE_URL` e `VITE_GATEWAY_URL`;
- reinicie o Vite após mudar variáveis `VITE_*`;
- confirme o prefixo `/api/checklist-app` no Gateway.

### Cadastro de perfil falha

O cadastro administrativo consulta `DASS_AUTH_BASE_URL/colaborador/:matricula`
com timeout de cinco segundos. Verifique a URL interna, a conectividade e a
existência da matrícula no serviço central.

## Observabilidade e segurança operacional

- `GET /api/health` é a verificação mínima de disponibilidade.
- Erros internos são registrados no processo da API; respostas não expõem o erro bruto.
- Não registre ou versione `.env`, JWTs, senhas ou refresh tokens.
- Mantenha `JWT_SECRET` sincronizado com o `dass_auth` por um canal seguro.
- Restrinja `CORS_ORIGINS` às origens reais dos frontends, separadas por vírgula.
- Garanta que Gateway/proxy preserve cookies e cabeçalhos `Set-Cookie`.
- Faça backup do PostgreSQL antes de migrations em ambientes persistentes.
