# Instalação e configuração

## Pré-requisitos

- Node.js compatível com as dependências dos `package-lock.json` e npm;
- PostgreSQL acessível pela API;
- `dass_auth` e API Gateway acessíveis;
- Docker com Compose apenas para os testes de integração.

## Banco e backend

```bash
cd backend
cp .env.example .env
npm ci
```

Preencha `backend/.env` sem versionar segredos:

| Variável | Obrigatória | Uso |
| --- | --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE` | Sim, sem `DATABASE_URL` | Conexão PostgreSQL. |
| `DATABASE_URL` | Alternativa | URL completa; tem precedência sobre `DB_*`. |
| `DB_SCHEMA` | Não | Schema da aplicação; padrão `checklist_app`. |
| `DB_POOL_MAX` | Não | Máximo de conexões do pool. |
| `HOST` | Não | Interface da API; padrão `localhost`. |
| `PORT` | Não | Porta da API; exemplo `7733`. |
| `FRONTEND_ORIGIN` | Não | Origem aceita pelo CORS; padrão `http://localhost:5173`. |
| `JWT_SECRET` | **Sim** | Mesmo segredo usado para assinar tokens no `dass_auth`. |
| `DASS_AUTH_BASE_URL` | Não | URL direta do serviço para validar matrículas. |
| `CHECKLIST_INITIAL_ADMIN_MATRICULA` | Para bootstrap | Única matrícula autorizada a criar o primeiro `ADMIN`. |

`JWT_SECRET` vazio ou igual ao antigo valor inseguro de exemplo impede a API de
iniciar.

Inicialize um banco/schema novo e aplique as demais migrations:

```bash
npm run db:init
npm run db:migrate
npm run db:status
npm run dev
```

`db:init` recusa um schema que já existe. Em instalações inicializadas, use
somente `db:migrate` para aplicar versões pendentes. Não altere uma migration já
aplicada: o runner detecta divergências de checksum.

O health check fica em `GET http://localhost:7733/api/health` e retorna `200`
quando a conexão com PostgreSQL está disponível ou `503` quando degradada.

## Frontend

```bash
cd frontend
cp .env.example .env
npm ci
npm run dev
```

Variáveis disponíveis:

| Variável | Padrão/finalidade |
| --- | --- |
| `VITE_APP_BASE_URL` | Base pública do SPA; exemplo `/checklist/`. |
| `VITE_API_URL` | Base da API pelo Gateway; padrão `/api/checklist-app/api`. |
| `VITE_AUTH_API_URL` | Base das rotas de autenticação; padrão `/api`. |
| `VITE_GATEWAY_URL` | Destino do proxy Vite; exemplo `http://localhost:2399`. |
| `VITE_API_TIMEOUT_MS` | Timeout dos clientes HTTP; padrão 15000 ms. |

O Vite escuta em `0.0.0.0:5173`, usa a base configurada e encaminha `/api` ao
Gateway. O preview de produção usa a porta `4173` com o mesmo proxy.

## Primeiro acesso

1. Garanta que `JWT_SECRET` seja o mesmo na API e no `dass_auth`.
2. Defina `CHECKLIST_INITIAL_ADMIN_MATRICULA` com a matrícula do administrador inicial.
3. Inicie banco, `dass_auth`, Gateway, backend e frontend.
4. Entre com a conta corporativa dessa matrícula.
5. O primeiro perfil local `ADMIN` será criado se a tabela `usuarios` estiver vazia.
6. Use Configurações para liberar os demais perfis.

Ao criar um perfil, a API consulta `DASS_AUTH_BASE_URL/colaborador/:matricula` e
obtém nome e função corporativos; senha e tokens não são copiados.

## Build e processo da API

```bash
cd frontend
npm run build
```

O resultado é criado em `frontend/dist`. A API pode ser executada diretamente
com `npm start` ou pelo PM2 a partir da raiz:

```bash
pm2 start ecosystem.config.cjs --env production
```

O arquivo PM2 gerencia apenas `checklist-api`; publicação do frontend, Gateway,
PostgreSQL e `dass_auth` deve ser providenciada pelo ambiente de implantação.

