# Checklist App — Plano de Correções

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir primeiro os defeitos confirmados que quebram fluxos ou comprometem integridade, depois robustez, acessibilidade e riscos condicionais validados.

**Architecture:** Manter a arquitetura Express/PostgreSQL/Vue existente. Validar relações no backend dentro da transação, usar recursos nativos (`AbortController`, constraints/UPSERT do PostgreSQL e elementos HTML semânticos) e evitar novas abstrações de produção. Cada tarefa deve terminar funcional e revisável isoladamente.

**Tech Stack:** Node.js, Express 5, PostgreSQL, Vue 3, Axios, Vitest e `node:test`.

**Spec:** `docs/superpowers/plans/2026-08-27-correcoes-checklist-app.md`, seção “Escopo confirmado”.

## Global Constraints

- Preservar as alterações locais preexistentes em `backend/db.js`, `backend/middlewares/auth.js`, `backend/test/db-foundation.test.js`, `frontend/src/services/api.js`, `frontend/src/views/ConsultarView.vue`, `backend/test/auth.test.js` e `frontend/test/apiAuth.test.js`.
- Antes da execução, o proprietário deve consolidar essas alterações em commit ou autorizar explicitamente trabalho sobre elas.
- Não adicionar dependência de runtime.
- Não mudar contratos públicos além das correções documentadas.
- Usar `git add -p` quando um arquivo contiver alterações preexistentes; nunca incluir hunks do usuário por acidente.
- Cada tarefa começa com teste vermelho, termina com teste verde e commit próprio.
- A integração PostgreSQL só pode rodar contra o banco descartável configurado pelo projeto; o script recria o schema.

## Escopo confirmado

1. Edição administrativa sem `ativo`; relações incompatíveis em submissões; colisão de identificadores de perguntas.
2. Erros 500 fora do contrato JSON; cookie malformado; corpo JSON `null`; rollback inseguro.
3. Validação de `ctq` e referências; filtro de marca; corrida na sincronização de catálogo.
4. Paginação ilimitada; ID de relatório permissivo; histórico usando relações atuais; chave `__proto__`.
5. Respostas assíncronas obsoletas no frontend; formulário sem estado de erro.
6. Controles inacessíveis por teclado; rota 404; popup bloqueado.
7. Riscos condicionais: placeholder JWT, timezone, assinatura no rascunho, foto legada e unicidade de modelo.

---

### Task 1: Tornar a fronteira HTTP segura e previsível

**Files:**
- Modify: `backend/index.js:7-53`
- Modify: `backend/middlewares/auth.js:5-10`
- Modify: `backend/.env.example:13-14`
- Test: `backend/test/auth.test.js`
- Create: `backend/test/http-errors.test.js`

**Interfaces:**
- Consumes: `JWT_SECRET`, middleware Express e formato `{ sucesso, mensagem }` já usado pela API.
- Produces: toda falha inesperada responde JSON 500; cookie inválido responde 401; `req.body === null` chega aos controllers como objeto vazio; placeholder JWT conhecido bloqueia startup.

- [ ] **Step 1: Escrever os testes vermelhos**

Adicionar casos que comprovem estes contratos:

```js
test('cookie percent-encoded inválido retorna 401 JSON', async () => {
  const response = await request('/api/dados/modelos', { Cookie: 'token=%' });
  assert.equal(response.status, 401);
  assert.match(response.headers.get('content-type'), /application\/json/);
});

test('erro inesperado retorna 500 JSON sem stack', async () => {
  const response = await request('/api/test/error');
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { sucesso: false, mensagem: 'Erro interno do servidor.' });
});
```

No mesmo arquivo, enviar corpo literal `null` a um endpoint mutável e esperar 400 JSON, não 500.

- [ ] **Step 2: Confirmar falha**

Run: `cd backend && npm run test:unit`

Expected: os novos casos falham com 500 HTML/`URIError`, ou o app não pode ser instanciado sem iniciar a porta.

- [ ] **Step 3: Implementar a menor correção**

Em `index.js`, exportar `app`, iniciar a porta somente em execução direta, normalizar corpo `null` após os parsers e substituir o `next(error)` terminal por JSON 500 com log no servidor. Em `auth.js`, capturar `decodeURIComponent` inválido e tratá-lo como ausência/token inválido. Deixar `JWT_SECRET=` vazio no exemplo e rejeitar o placeholder antigo explicitamente no startup.

```js
app.use((req, _res, next) => {
  if (req.body === null) req.body = {};
  next();
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
});
```

- [ ] **Step 4: Validar**

Run: `cd backend && npm run test:unit && node --check index.js && node --check middlewares/auth.js`

Expected: todos os testes passam e respostas de erro não contêm stack.

- [ ] **Step 5: Commit**

```bash
git add -p backend/index.js backend/middlewares/auth.js backend/.env.example backend/test/auth.test.js backend/test/http-errors.test.js
git commit -m "fix(api): normalize authentication and error responses"
```

---

### Task 2: Garantir integridade da submissão

**Files:**
- Modify: `backend/controllers/ChecklistController.js:91-132`
- Modify: `backend/test/checklist-validation.test.js:113-135`

**Interfaces:**
- Consumes: `id_modelo`, `id_setor`, `id_celula` do payload.
- Produces: HTTP 400 quando modelo, setor e célula não formam uma combinação válida; inserção somente após uma consulta relacional bem-sucedida.

- [ ] **Step 1: Substituir o teste que hoje aceita referências independentes**

```js
test('rejeita modelo e célula de setores diferentes', async () => {
  // O mock retorna modelo do setor 20 e célula do setor 30.
  await checklist.salvarChecklist(submissaoValida(), res);
  assert.equal(res.statusCode, 400);
  assert.equal(consultas.some(({ sql }) => /INSERT INTO formulario_submissoes/.test(sql)), false);
});
```

Adicionar um segundo caso válido, no qual a mesma consulta confirma modelo, setor e célula relacionados e o insert retorna 201.

- [ ] **Step 2: Confirmar falha**

Run: `cd backend && node --test --test-concurrency=1 test/checklist-validation.test.js`

Expected: a combinação inconsistente ainda retorna 201.

- [ ] **Step 3: Corrigir na transação**

Trocar as três validações isoladas por uma consulta parametrizada que relacione `modelo.id_setor_fk`, `celulas_producao.id_setor_fk`, `modelo.id_marca_fk` e `celulas_producao.id_marca_fk`. Marca de célula nula só deve ser aceita se essa for a regra já praticada pelos cadastros; caso contrário, exigir igualdade.

```sql
SELECT m.id
FROM modelo m
JOIN setores s ON s.id = $2 AND s.ativo = 1
JOIN celulas_producao c ON c.id = $3 AND c.ativo = 1
WHERE m.id = $1
  AND m.ativo = 1
  AND m.id_setor_fk = s.id
  AND c.id_setor_fk = s.id
  AND (c.id_marca_fk IS NULL OR c.id_marca_fk = m.id_marca_fk)
FOR SHARE OF m, s, c
```

- [ ] **Step 4: Reutilizar o helper transacional existente**

Aplicar `withTransaction` de `backend/database/transaction.js` ao fluxo, removendo `ROLLBACK` manual que pode mascarar o erro original.

- [ ] **Step 5: Validar e commitar**

Run: `cd backend && npm run test:unit`

```bash
git add backend/controllers/ChecklistController.js backend/test/checklist-validation.test.js
git commit -m "fix(checklists): enforce submission relationships"
```

---

### Task 3: Impedir colisões e inconsistências nos cadastros

**Files:**
- Modify: `backend/controllers/CadastrosController.js:20-125,220-300,404-529,626-662`
- Modify: `backend/controllers/PerfisController.js:50-64`
- Modify: `backend/test/cadastros-validation.test.js`

**Interfaces:**
- Consumes: categorias, `ctq`, setor/marca/célula e perfil.
- Produces: identificações únicas com até 100 caracteres; boolean estrito; FKs inválidas/inativas retornam 400; catálogo concorrente usa UPSERT.

- [ ] **Step 1: Escrever casos vermelhos**

```js
test('rejeita categorias cujos slugs colidem', async () => {
  const body = {
    nomeModelo: 'Modelo',
    id_marca_fk: 7,
    id_setor: 3,
    categorias: {
      'A B': { ctq: false, perguntas: ['Primeira'] },
      A_B: { ctq: false, perguntas: ['Segunda'] },
    },
  };
  await cadastros.criarModelo({ body }, res);
  assert.equal(res.statusCode, 400);
});

test('rejeita ctq textual', async () => {
  await cadastros.criarCategoriaPadrao({ body: { nome: 'Teste', ctq: 'false', perguntas: ['P'] } }, res);
  assert.equal(res.statusCode, 400);
});
```

Adicionar casos para identificador acima de 100 caracteres, setor/marca/célula inexistente ou inativo e perfil com FK inválida. Esperar 400 e zero writes.

- [ ] **Step 2: Confirmar falhas**

Run: `cd backend && node --test --test-concurrency=1 test/cadastros-validation.test.js`

- [ ] **Step 3: Corrigir identificadores e booleanos**

Durante `categoriasValidas`, calcular as identificações finais, rejeitar duplicatas com `Set`, rejeitar comprimento acima de 100 e exigir `typeof ctq === 'boolean'` quando fornecido. Não criar um novo gerador de IDs.

- [ ] **Step 4: Validar referências antes de escrever**

Usar as queries existentes de marcas/setores como padrão. Não converter FK inválida de perfil silenciosamente para `null`; `null` só é aceito quando o cliente o envia explicitamente.

- [ ] **Step 5: Remover a corrida do catálogo**

Substituir `SELECT` seguido de `INSERT` por `INSERT ... ON CONFLICT ... DO NOTHING`, usando a constraint já existente da categoria padrão. Não capturar `23505` e continuar dentro de transação abortada.

- [ ] **Step 6: Validar e commitar**

Run: `cd backend && npm run test:unit`

```bash
git add backend/controllers/CadastrosController.js backend/controllers/PerfisController.js backend/test/cadastros-validation.test.js
git commit -m "fix(cadastros): validate identifiers and relationships"
```

---

### Task 4: Corrigir consultas de histórico e relatórios

**Files:**
- Modify: `backend/controllers/SubmissoesController.js:4-75`
- Modify: `backend/controllers/RelatoriosController.js:4-24`
- Create: `backend/test/submissoes-relatorios.test.js`

**Interfaces:**
- Consumes: filtros e IDs HTTP.
- Produces: filtro de marca por FK canônica; página limitada; ID decimal estrito; setor exibido a partir da submissão.

- [ ] **Step 1: Escrever testes vermelhos**

```js
test('limita página e rejeita ID de relatório com sufixo', async () => {
  await submissoes.listar({ query: { page: '2147483647', pageSize: '100' } }, listaRes);
  assert.ok(offsetExecutado <= 999900); // página máxima 10.000, 100 itens

  await relatorios.buscar({ params: { id: '1abc' } }, relatorioRes);
  assert.equal(relatorioRes.statusCode, 400);
});
```

Adicionar testes que inspecionem SQL/parâmetros: filtro `marca` usa `id_marca_fk`/join de `marcas`; nome do setor vem de `formulario_submissoes.id_setor`, não do setor atual do modelo.

- [ ] **Step 2: Confirmar falhas**

Run: `cd backend && node --test --test-concurrency=1 test/submissoes-relatorios.test.js`

- [ ] **Step 3: Implementar consultas mínimas**

Limitar `page` a um teto documentado (começar com 10.000), manter `pageSize <= 100`, validar ID com `Number()` + `Number.isInteger()` + positivo e ajustar joins. Preservar fallback do texto legado de marca somente para registros antigos.

- [ ] **Step 4: Tornar o agrupamento imune a nomes reservados**

Em `buscarPerguntas`, trocar o acumulador `{}` por `Object.create(null)`; não criar sanitizador próprio.

- [ ] **Step 5: Validar e commitar**

Run: `cd backend && npm run test:unit`

```bash
git add backend/controllers/SubmissoesController.js backend/controllers/RelatoriosController.js backend/controllers/ChecklistController.js backend/test/submissoes-relatorios.test.js
git commit -m "fix(reports): preserve submission context and bound queries"
```

---

### Task 5: Corrigir payload administrativo e respostas assíncronas obsoletas

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Modify: `frontend/src/views/ConfiguracoesView.vue:492-505,645-715`
- Modify: `frontend/src/views/CheckSelecao.vue:156-186`
- Modify: `frontend/src/views/ConsultarView.vue:243-321`
- Create: `frontend/test/configuracoes.test.js`
- Create: `frontend/test/async-views.test.js`

**Interfaces:**
- Consumes: Axios com suporte nativo a `AbortController`.
- Produces: edição envia `ativo`; somente a requisição vigente altera estado; limpar filtros dispara uma busca.

- [ ] **Step 1: Instalar apenas infraestrutura de teste de componentes**

Run: `cd frontend && npm install --save-dev @vue/test-utils jsdom`

Não adicionar biblioteca de gerenciamento de requisições.

- [ ] **Step 2: Escrever testes vermelhos de edição**

Montar `ConfiguracoesView`, abrir item ativo de setor/unidade/célula, salvar e verificar exatamente:

```js
expect(api.put).toHaveBeenCalledWith('/cadastros/setores/1', {
  nome: 'Setor revisado',
  ativo: true,
});
```

Repetir para unidade e célula, incluindo suas FKs.

- [ ] **Step 3: Escrever testes vermelhos de ordenação**

Usar promises controláveis: iniciar A, iniciar B, resolver B e depois A. Verificar que modelos, aba e histórico continuam com B. Em `limparFiltros`, verificar uma única chamada.

- [ ] **Step 4: Corrigir payload**

Adicionar `ativo` ao estado do formulário, preenchê-lo em `abrirModal` e enviá-lo somente nas edições que exigem o campo. Manter criação inalterada.

- [ ] **Step 5: Corrigir concorrência com recurso nativo**

Manter um `AbortController` por fluxo. Antes de nova busca, abortar a anterior; passar `{ signal }` ao Axios e não exibir toast para cancelamento. Em `buscarDados`, capturar a aba e endpoint antes do `await`. Remover a chamada direta duplicada de `limparFiltros` e deixar o watcher disparar a busca.

- [ ] **Step 6: Validar e commitar**

Run: `cd frontend && npm test && npm run build`

```bash
git add -p frontend/package.json frontend/package-lock.json frontend/src/views/ConfiguracoesView.vue frontend/src/views/CheckSelecao.vue frontend/src/views/ConsultarView.vue frontend/test/configuracoes.test.js frontend/test/async-views.test.js
git commit -m "fix(ui): preserve edits and discard stale responses"
```

---

### Task 6: Tornar falhas e navegação recuperáveis

**Files:**
- Modify: `frontend/src/views/FormularioView.vue:219-230`
- Modify: `frontend/src/views/DetalheRelatorioView.vue:165-183`
- Modify: `frontend/src/router/index.js:4-55`
- Create: `frontend/src/views/NotFoundView.vue`
- Modify: `frontend/test/async-views.test.js`
- Create: `frontend/test/router-print.test.js`

**Interfaces:**
- Produces: erro ao carregar perguntas com retry; impressão segura para popup bloqueado/dado legado; fallback 404.

- [ ] **Step 1: Escrever testes vermelhos**

Cobrir: falha de `/checklists/perguntas/:modelo` mostra mensagem e botão “Tentar novamente”; clique repete a chamada; `window.open()` retornando `null` não lança; rota desconhecida renderiza `NotFoundView`.

```js
window.open = vi.fn(() => null);
expect(() => wrapper.vm.imprimirImagem()).not.toThrow();
expect(toast.warning).toHaveBeenCalled();
```

- [ ] **Step 2: Confirmar falhas**

Run: `cd frontend && npm test -- async-views.test.js router-print.test.js`

- [ ] **Step 3: Implementar estado de erro e retry**

Extrair a chamada já existente para `carregarPerguntas()`, manter `isLoadingPerguntas` e `erroPerguntas`, e reutilizar `FeedbackState`. Não criar store.

- [ ] **Step 4: Corrigir impressão e 404**

Validar `window.open()` antes de acessar `document`. Criar `img` com DOM e atribuir `img.src` somente após aceitar `data:image/(png|jpeg|webp);base64,`; não interpolar o valor em HTML. Adicionar rota final `/:pathMatch(.*)*`.

- [ ] **Step 5: Validar e commitar**

Run: `cd frontend && npm test && npm run build`

```bash
git add frontend/src/views/FormularioView.vue frontend/src/views/DetalheRelatorioView.vue frontend/src/router/index.js frontend/src/views/NotFoundView.vue frontend/test/async-views.test.js frontend/test/router-print.test.js
git commit -m "fix(ui): make loading and navigation failures recoverable"
```

---

### Task 7: Corrigir acessibilidade básica dos controles existentes

**Files:**
- Modify: `frontend/src/views/CheckSelecao.vue:33-36`
- Modify: `frontend/src/views/ConsultarView.vue:118-124`
- Modify: `frontend/src/views/ConfiguracoesView.vue:140-146`
- Modify: `frontend/src/views/FormularioView.vue:38-68`
- Create: `frontend/test/accessibility.test.js`

**Interfaces:**
- Produces: seleção, abertura de linha e respostas operáveis por Tab, Enter e Espaço, com nome/estado acessível.

- [ ] **Step 1: Escrever testes vermelhos**

Montar cada view e verificar que os controles são `button`/link ou possuem foco e handlers equivalentes. Para respostas, verificar `role="radio"` e `aria-checked` atualizado.

```js
const option = wrapper.get('[role="radio"]');
await option.trigger('keydown', { key: ' ' });
expect(option.attributes('aria-checked')).toBe('true');
```

- [ ] **Step 2: Implementar com HTML nativo**

Preferir `<button type="button">` e `<RouterLink>`; usar ARIA manual somente no grupo de opções que não possa ser um `<input type="radio">`. Preservar aparência com CSS existente.

- [ ] **Step 3: Validar e commitar**

Run: `cd frontend && npm test && npm run build`

```bash
git add -p frontend/src/views/CheckSelecao.vue frontend/src/views/ConsultarView.vue frontend/src/views/ConfiguracoesView.vue frontend/src/views/FormularioView.vue frontend/test/accessibility.test.js
git commit -m "fix(a11y): make primary controls keyboard accessible"
```

---

### Task 8: Decidir e tratar riscos condicionais

**Files:**
- Inspect: configuração real de deploy sem imprimir segredos
- Inspect: requisitos de assinatura e unicidade de modelos
- Modify if timezone risk is confirmed: `migrations/001_initial_schema.sql:43,108-109`
- Create if timezone risk is confirmed: `migrations/005_timestamps_timestamptz.sql`
- Modify if signature persistence is required: `frontend/src/views/FormularioView.vue:179-215`
- Modify if signature persistence is required: `frontend/src/services/draftPersistence.js`

**Interfaces:**
- Produces: decisão registrada para timezone, assinatura e unicidade; mudança somente quando a pré-condição for confirmada.

- [ ] **Step 1: Verificar sem expor dados**

Confirmar apenas: o secret implantado difere do placeholder; timezone de PostgreSQL/API; assinatura deve ou não sobreviver ao rascunho; nomes de modelo são únicos globalmente ou por marca/setor.

- [ ] **Step 2: Aplicar somente decisões confirmadas**

- Se o secret for placeholder: rotacioná-lo no gestor de segredos e no `dass_auth` com autorização operacional; nunca registrar o valor no Git.
- Se timestamps representam instantes: criar migração `timestamptz` com conversão explícita do timezone histórico e teste de ida/volta UTC.
- Se assinatura deve persistir: armazená-la no mesmo mecanismo local do rascunho, restaurar o `SignaturePad` e apagar após envio.
- Se nome de modelo deve ser único: criar índice único no escopo confirmado e retornar 409 para `23505`.

- [ ] **Step 3: Validar e commitar cada decisão separadamente**

Run: `cd backend && npm run test:all`

Run: `cd frontend && npm test && npm run build`

Não agrupar migração, assinatura e unicidade no mesmo commit.

---

### Task 9: Verificação integrada e fechamento

**Files:**
- Modify only if a regression is found: arquivos da tarefa responsável.

**Interfaces:**
- Produces: evidência final de que as correções funcionam juntas.

- [ ] **Step 1: Verificar estado do workspace**

Run: `git status --short && git diff --check`

Expected: somente mudanças/commits previstos; nenhuma alteração preexistente incorporada por engano.

- [ ] **Step 2: Rodar backend completo no banco descartável**

Run: `cd backend && npm run test:all`

Expected: unitários e integração aprovados. Se o PostgreSQL de teste não estiver disponível, registrar a lacuna sem apontar sucesso.

- [ ] **Step 3: Rodar frontend completo**

Run: `cd frontend && npm test && npm run build`

Expected: todos os testes e build aprovados.

- [ ] **Step 4: Smoke test manual**

Verificar: editar setor/unidade/célula; alternar setores/marcas sob rede lenta; enviar checklist válido; rejeitar combinação inconsistente; filtrar histórico por marca; abrir relatório; navegar por teclado; acessar rota inexistente.

- [ ] **Step 5: Revisar escopo**

Confirmar que não foram adicionadas abstrações, dependências de runtime, otimizações sem medição ou correções dos itens condicionais sem decisão explícita.
