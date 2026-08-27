# Task 2 — integridade relacional da submissão

## Implementação

- `backend/controllers/ChecklistController.js`: substituídas as três consultas isoladas por uma consulta parametrizada que relaciona modelo, setor e célula, valida a marca da célula (`NULL` ou igual à marca do modelo) e bloqueia as linhas com `FOR SHARE OF m, s, c`.
- O fluxo passou a usar `withTransaction`; o `ROLLBACK` manual do controller foi removido.
- `backend/test/checklist-validation.test.js`: a regressão agora rejeita modelo/célula de setores diferentes e cobre a combinação relacionada válida com insert 201.

## Evidência RED/GREEN

- RED: `cd backend && node --test --test-concurrency=1 test/checklist-validation.test.js` terminou com exit 1; antes da implementação, a combinação inconsistente respondia `201` (`201 !== 400`).
- GREEN: o mesmo comando passou após a implementação (`tests 1, pass 1, fail 0`).
- Suíte: `cd backend && npm run test:unit` passou com 5 arquivos, 0 falhas.
- Verificações: `git diff --check` e `node --check backend/controllers/ChecklistController.js` passaram.

## Auto-review e preocupações

- Não há insert quando a consulta relacional não retorna linha; marca nula da célula permanece válida no mesmo setor.
- Contrato HTTP 400/201 e envelope JSON foram preservados; a mensagem de incompatibilidade agora é única para modelo/setor/célula inválidos.
- Sem dependências novas, frontend intocado e sem refatoração lateral.
