# Arquitetura

## Visão de componentes

```text
Navegador
  └─ Vue/Vite (`frontend`)
       ├─ /api/auth/* ───────────────┐
       └─ /api/checklist-app/api/* ──┤
                                     v
                              API Gateway
                               ├─ dass_auth
                               └─ Express (`backend`)
                                    ├─ controllers
                                    ├─ middleware JWT/perfil
                                    └─ PostgreSQL
                                         └─ schema checklist_app
```

O Gateway apenas encaminha as requisições. O `dass_auth` autentica a identidade
corporativa e mantém a sessão; a API do Checklist decide a autorização com base
no perfil local. Consulte [Integração com Gateway e dass_auth](INTEGRACAO_GATEWAY_DASS_AUTH.md)
para o fluxo detalhado.

## Frontend

O código está em `frontend/src`:

- `views/`: páginas de login, seleção, formulário, relatórios, consulta e configuração;
- `components/`: elementos compartilhados e abas administrativas;
- `services/api.js`: cliente da API do Checklist e renovação após resposta `401`;
- `services/auth.js`: cliente das rotas centrais de autenticação;
- `services/session.js`: restauração, encerramento e cache local do perfil;
- `router/index.js`: rotas e guardas de autenticação/administração.

Somente o perfil não sensível é guardado em `localStorage`. Os tokens permanecem
em cookies HTTP-only administrados pelo serviço central.

## Backend

O `backend/index.js` configura Express, CORS, limites de corpo, health check,
rotas e tratamento final de erros. A organização interna é:

- `routes/`: contrato HTTP e requisito de papel;
- `controllers/`: validação, regras de negócio e consultas;
- `middlewares/auth.js`: valida JWT, carrega perfil local e aplica autorização;
- `database/transaction.js`: execução transacional reutilizável;
- `utils/scoring.js`: normalização e cálculo de resultados;
- `scripts/db.js`: inicialização, migração e inspeção do schema.

## Dados

As entidades principais são:

```text
marcas ─┬─< celulas_producao >─ setores
        └─< modelo >────────────┘
             └─< categorias ─< perguntas

usuarios ─< formulario_submissoes >─ modelo
                    ├─ setor
                    ├─ célula
                    └─< formulario_evidencias
```

`formulario_submissoes` guarda respostas em JSONB, assinatura em `bytea` e um
snapshot JSONB versionado do documento. Para novas submissões, esse snapshot
preserva também auditor, marca, setor, célula, perguntas e a contagem histórica
de evidências. As fotos ficam em `formulario_evidencias`, com expiração própria,
e não dentro das respostas permanentes. Consulte [Documentos de checklist e
evidências](DOCUMENTOS_E_EVIDENCIAS.md).

O schema da aplicação é fixo em `checklist_app`; ele não é uma variável do
ambiente de execução.

As migrations em `migrations/` são ordenadas por versão, registradas em
`schema_migrations` e protegidas por checksum. Uma instalação vazia começa em
`001_initial_schema.sql`; migrations posteriores são executadas por `db:migrate`.

## Autenticação e autorização

1. O frontend autentica em `/api/auth/login`.
2. O navegador recebe cookies HTTP-only.
3. Chamadas do Checklist passam pelo Gateway e levam o cookie `token`.
4. O middleware valida o JWT com o `JWT_SECRET` compartilhado.
5. A matrícula localiza um cadastro ativo em `checklist_app.usuarios`.
6. O papel local autoriza ou rejeita a rota.
7. Matrículas sem cadastro prévio recebem `403` e não são persistidas.

Quando ainda não existe nenhum perfil configurado, a matrícula definida em
`CHECKLIST_INITIAL_ADMIN_MATRICULA` pode assumir automaticamente o primeiro
perfil `ADMIN`. Esse bootstrap não libera outras matrículas.
