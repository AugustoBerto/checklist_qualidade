# Task 3 — integridade dos cadastros

## Implementação

- `backend/controllers/CadastrosController.js`
  - valida IDs positivos estritos, setores existentes e ativos, e marcas existentes antes de inserir/atualizar modelos e células;
  - calcula as identificações das perguntas com o `slugify` existente, rejeita colisões e comprimentos acima de 100 caracteres;
  - exige `ctq` booleano quando fornecido;
  - preserva `null` explícito para marca opcional de célula;
  - troca a leitura seguida de inserção do catálogo por `INSERT ... ON CONFLICT ... DO NOTHING`, inferindo o índice único parcial existente em `LOWER(TRIM(nome)) WHERE ativo = 1`;
  - remove o `catch` que engolia erros da sincronização do catálogo dentro da transação.
- `backend/controllers/PerfisController.js`: valida todas as FKs opcionais antes do acesso ao dass_auth/UPDATE, aceita apenas ID válido ou `null` explicitamente, e verifica existência/atividade antes de escrever.
- `backend/test/cadastros-validation.test.js`: adiciona regressões para colisão de slugs, limite de identificador, `ctq` textual, setor/marca inválidos e FK inválida de perfil; ajusta mocks existentes para as consultas relacionais.

## Evidência RED/GREEN

- RED: `cd backend && node --test --test-concurrency=1 test/cadastros-validation.test.js` terminou com exit 1 antes da implementação; os novos casos falharam com conexão/insert indevido, `500 !== 400` para `ctq` e FKs, e `503 !== 400` para perfil.
- GREEN: o mesmo comando passou após a implementação: `tests 1, pass 1, fail 0`.
- Suíte backend: `cd backend && npm run test:unit` passou: `tests 5, pass 5, fail 0`.
- Sintaxe/diff: `node --check controllers/CadastrosController.js`, `node --check controllers/PerfisController.js` e `git diff --check` passaram.

## Auto-review, divergências e preocupações

- FKs inválidas retornam 400 antes de qualquer INSERT/UPDATE; rollback do modelo ocorre na transação já aberta.
- O índice do catálogo é um índice único parcial, não uma constraint nomeada; por isso o `ON CONFLICT` usa inferência por expressão/predicado, sem criar migração fora do escopo.
- O schema não possui `marcas.ativo`; marcas são validadas por existência. Setores, unidades e células são validados com `ativo = 1`; turnos não possuem `ativo` e são validados por existência.
- Integração PostgreSQL não foi executada: Docker está instalado, mas a sessão não tem permissão para acessar `/var/run/docker.sock`. A sintaxe SQL do `ON CONFLICT` fica para a execução de integração autorizada.
- Nenhuma dependência, arquivo frontend ou migração foi alterado.
