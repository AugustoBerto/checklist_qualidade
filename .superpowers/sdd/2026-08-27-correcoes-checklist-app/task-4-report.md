# Task 4 — histórico e relatórios

## Implementação

- `backend/controllers/SubmissoesController.js`: limita a página a 10.000, filtra marca pelo nome associado à FK com fallback para o texto legado e prioriza o setor gravado na submissão, mantendo fallback legado por célula/usuário.
- `backend/controllers/RelatoriosController.js`: exige ID inteiro positivo e resolve o setor pela submissão, com o mesmo fallback legado.
- `backend/controllers/ChecklistController.js`, `SubmissoesController.js` e `RelatoriosController.js`: acumuladores de categorias usam `Object.create(null)` para aceitar nomes como `__proto__` sem herdar propriedades.
- `backend/test/submissoes-relatorios.test.js`: cobre paginação, marca canônica/legada, contexto histórico de setor, ID estrito e categorias com nomes reservados.
- `frontend/package-lock.json`: sincronizado com a dependência `vue3-select-component` já declarada no `package.json`, conforme autorização explícita do proprietário.

## RED / GREEN

- RED inicial: 5 testes falharam por página ilimitada, filtro textual de marca, setor atual, ID permissivo e `__proto__`.
- GREEN inicial: 5/5 testes focados passaram.
- Revisão encontrou fallback de marca incorreto, setor atual do modelo ainda elegível e acumuladores vulneráveis nos detalhes/gráfico.
- RED da revisão: 3/6 testes falharam reproduzindo esses cenários.
- GREEN final: 6/6 testes focados passaram.

## Revisão

- Dois revisores independentes avaliaram contrato e segurança.
- Após as correções, ambos retornaram sem achados Critical ou Important e consideraram a Task 4 pronta para commit.
- Lacuna menor aceita: marca e setor são validados unitariamente pela SQL emitida; a suíte de integração PostgreSQL existente passou, mas não possui fixtures específicas para essas duas consultas.

## Verificação

- `cd backend && npm run test:all`: passou; 49 testes unitários, 1 skip esperado na fase unitária e 8 testes PostgreSQL descartáveis na fase de integração.
- `cd frontend && npm test && npm run build`: passou; 7 testes e build Vite concluído.
- `node --check` nos três controllers alterados e `git diff --check`: passaram.
