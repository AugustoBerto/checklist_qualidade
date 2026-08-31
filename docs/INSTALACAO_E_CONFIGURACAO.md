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
| `DATABASE_URL` | **Sim** | URL PostgreSQL completa, no formato `postgresql://usuario:senha@host:5432/banco`. |
| `HOST` | Não | Interface da API; padrão `localhost`. |
| `PORT` | Não | Porta da API; exemplo `7733`. |
| `CORS_ORIGINS` | Não | Origens aceitas pelo CORS, separadas por vírgula; padrão `http://localhost:5173`. |
| `JWT_SECRET` | **Sim** | Mesmo segredo usado para assinar tokens no `dass_auth`. |
| `DASS_AUTH_BASE_URL` | Não | URL interna do `dass_auth`; padrão `http://localhost:2123`. |
| `CHECKLIST_INITIAL_ADMIN_MATRICULA` | Para bootstrap | Única matrícula autorizada a criar o primeiro `ADMIN`. |

Caracteres reservados em usuário ou senha de `DATABASE_URL` (como `@`, `:`,
`/`, `#` e `%`) devem ser codificados no formato URL.

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
| `VITE_APP_BASE_URL` | Base pública do SPA; exemplo `/checklist/`. Obrigatória no build de produção. |
| `VITE_GATEWAY_URL` | Origem do Gateway usada pelos clientes HTTP e pelo proxy Vite; exemplo `http://localhost:2399`. Obrigatória no build de produção. |
| `VITE_API_TIMEOUT_MS` | Timeout dos clientes HTTP; padrão 15000 ms. |

O Vite escuta em `0.0.0.0:5173` e usa a base configurada. O proxy de
desenvolvimento encaminha URLs relativas iniciadas por `/api`; com as URLs
absolutas recomendadas, os clientes acessam o Gateway diretamente. O preview de
produção usa a porta `4173`.

Na VPS, defina o host acessível pelo navegador antes de gerar o bundle:

```env
VITE_APP_BASE_URL=/checklist/
VITE_GATEWAY_URL=http://<HOST_DA_VPS>:2399
```

Variáveis `VITE_*` são incorporadas aos arquivos durante `npm run build`; mudar
o `.env` depois do build não altera o frontend já publicado.

## Primeiro acesso

1. Garanta que `JWT_SECRET` seja o mesmo na API e no `dass_auth`.
2. Defina `CHECKLIST_INITIAL_ADMIN_MATRICULA` com a matrícula do administrador inicial.
3. Inicie banco, `dass_auth`, Gateway, backend e frontend.
4. Entre com a conta corporativa dessa matrícula.
5. O primeiro perfil local `ADMIN` será criado se ainda não existir nenhum perfil configurado.
6. Use Configurações para cadastrar previamente os demais colaboradores por matrícula.
7. Somente colaboradores com cadastro ativo conseguem entrar no Checklist.

No cadastro manual, a API consulta
`DASS_AUTH_BASE_URL/colaborador/:matricula` para obter nome e função. Senha e
tokens não são copiados para o banco local.

## Build e processo da API

O backend executa JavaScript diretamente no Node.js e não produz arquivos
compilados. Por padronização, sua etapa de build valida a sintaxe do ponto de
entrada:

```bash
cd backend
npm run build
```

```bash
cd frontend
npm run build
```

O resultado é criado em `frontend/dist`. A API pode ser executada diretamente
com `npm start` ou pelo PM2 a partir do diretório `backend`:

```bash
cd backend
pm2 start ecosystem.config.cjs
```

O arquivo PM2 gerencia apenas `checklist-api`; publicação do frontend, Gateway,
PostgreSQL e `dass_auth` deve ser providenciada pelo ambiente de implantação.
