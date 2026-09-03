# Checklist App

Aplicação web para criar modelos de checklist de qualidade, executar inspeções,
registrar evidências e consultar relatórios. O acesso usa a sessão corporativa do
`dass_auth`; papéis e vínculos operacionais são mantidos pelo próprio Checklist.

## Componentes

- **Frontend:** Vue 3, Vue Router, Vite, Axios e ECharts.
- **API:** Node.js, Express e PostgreSQL.
- **Autenticação:** cookie JWT emitido pelo `dass_auth` e encaminhado pelo API Gateway.
- **Banco:** schema PostgreSQL `checklist_app`, versionado por migrations SQL.

## Início rápido

Pré-requisitos: Node.js com npm, PostgreSQL e uma instância acessível do
`dass_auth`/Gateway.

```bash
cd backend
cp .env.example .env
npm ci
npm run db:init
npm run db:migrate
npm run dev
```

Em outro terminal:

```bash
cd frontend
cp .env.example .env
npm ci
npm run dev
```

A interface abre em `http://localhost:5173/checklist/` com a configuração de
exemplo. Antes de iniciar a API, configure um `JWT_SECRET` válido e igual ao do
`dass_auth`. O roteiro completo está em [Operação](docs/OPERACAO.md).

## Documentação

- [Visão geral e regras de negócio](docs/VISAO_GERAL.md)
- [Arquitetura](docs/ARQUITETURA.md)
- [Referência da API](docs/API.md)
- [Operação, deploy e manutenção](docs/OPERACAO.md)
- [Padrão de publicação web e proxy reverso](docs/PADRAO_PUBLICACAO.md)
- [Banco de dados e migrations](migrations/README.md)

## Comandos principais

| Diretório | Comando | Finalidade |
| --- | --- | --- |
| `backend` | `npm run build` | Valida a sintaxe do ponto de entrada da API (sem gerar artefatos). |
| `backend` | `npm run dev` | API com recarga automática |
| `backend` | `npm start` | API sem recarga automática |
| `backend` | `npm test` | Testes unitários |
| `backend` | `npm run test:integration` | Testes com PostgreSQL descartável via Docker |
| `backend` | `npm run test:all` | Testes unitários e de integração |
| `backend` | `npm run db:status` | Estado das migrations |
| `backend` | `npm run evidencias:cleanup` | Remove o conteúdo de evidências expiradas |
| `frontend` | `npm run dev` | Servidor Vite de desenvolvimento |
| `frontend` | `npm test` | Testes Vitest |
| `frontend` | `npm run build` | Build de produção |
| `frontend` | `npm run deploy` | Build e publicação atômica no Apache |
