# Final fix report — Task 3

## Escopo abordado

- `backend/controllers/CadastrosController.js`: `criarCelula` e `atualizarCelula` agora executam `FOR SHARE` e `INSERT`/`UPDATE` no mesmo `withTransaction(db, client => ...)`.
- `backend/controllers/PerfisController.js`: criação consulta o `dass_auth` antes de abrir a transação; em criação e atualização as FKs travadas e o write usam o mesmo cliente transacional.
- `backend/controllers/CadastrosController.js`: conflito único (`23505`) na atualização de categoria padrão retorna `409`.
- `backend/test/integration/database.integration.test.js`: o cenário de UPSERT dispara as duas criações com `Promise.all`.

## RED / GREEN

- RED: após adicionar as regressões e antes de alterar produção, `node test/cadastros-validation.test.js` teve 3 falhas esperadas: células e perfil retornaram `500` em vez de `201`/`200` por consultarem o pool, e atualização de categoria retornou `500` em vez de `409` para `23505`.
- GREEN: `cd backend && node --test --test-concurrency=1 test/cadastros-validation.test.js` passou (`1` arquivo, `1` pass, `0` fail; execução direta: `24` testes, `24` pass).
- As regressões tornam `db.query` do pool um erro e verificam `BEGIN → validação FOR SHARE → write → COMMIT → release` no cliente conectado para criação/atualização de célula e perfil. A criação de perfil também verifica `fetch` antes de `BEGIN`.

## Findings da revisão

- Important corrigido: locks e writes não compartilham mais conexões diferentes nos quatro fluxos requeridos.
- Minor corrigido: o teste de integração de catálogo é concorrente via `Promise.all`.
- Minor corrigido: colisão concorrente de atualização de categoria (`23505`) é mapeada a `409`, com teste focado.
- Minor deferido para ruling: omitir `id_marca_fk` em célula continua `400`. O requisito exige `null` explícito e o frontend já o envia; aceitar omissão mudaria esse contrato sem necessidade demonstrada.

## Verificação

- `cd backend && npm run test:unit`: passou (`5` arquivos, `5` pass, `0` fail).
- `node --check controllers/CadastrosController.js`, `node --check controllers/PerfisController.js` e `git diff --check`: passaram.
- `cd backend && npm run test:integration`: bloqueado antes de iniciar testes por `permission denied` em `/var/run/docker.sock`; não houve validação PostgreSQL real nesta sessão.

## Arquivos alterados

- `backend/controllers/CadastrosController.js`
- `backend/controllers/PerfisController.js`
- `backend/test/cadastros-validation.test.js`
- `backend/test/integration/database.integration.test.js`
- `.superpowers/sdd/2026-08-27-correcoes-checklist-app/final-fix-report.md`
