# Task 5 — payload administrativo e respostas assíncronas

## Implementação

- `frontend/src/views/ConfiguracoesView.vue`: preserva `ativo` ao editar setor, unidade e célula, sem alterar payloads de criação; captura aba/endpoint antes do `await` e invalida buscas anteriores, inclusive ao trocar para aba custom/cache ou desmontar.
- `frontend/src/views/CheckSelecao.vue`: usa `AbortController` no carregamento de modelos, ignora respostas obsoletas e cancela ao limpar/resetar a seleção ou desmontar.
- `frontend/src/views/ConsultarView.vue`: cancela buscas anteriores, mantém apenas a resposta vigente, integra busca textual ao watcher sem duplicar debounce e cancela busca/timer ao desmontar.
- `frontend/test/configuracoes.test.js`: monta a view real e valida payloads exatos de setor, unidade e célula.
- `frontend/test/async-views.test.js`: cobre ordenação A/B nos três fluxos, limpeza única de filtros, invalidação sem nova requisição e cleanup no unmount.
- `frontend/package.json` e `package-lock.json`: adicionam somente `@vue/test-utils` e `jsdom` como infraestrutura de desenvolvimento.

## RED / GREEN

- RED de payload: 3/3 testes falharam pela ausência de `ativo`.
- RED assíncrono inicial: 4/4 testes falharam por respostas A sobrescrevendo B e limpeza duplicada.
- GREEN inicial: 7/7 testes focados passaram.
- Revisão encontrou limpeza textual sem busca, modelos pendentes após limpar setor, busca residual ao trocar para aba sem request e ausência de cleanup.
- RED da revisão: 4/7 testes assíncronos falharam reproduzindo os cenários.
- GREEN final: 10/10 testes focados passaram.

## Revisão

- Dois revisores independentes avaliaram contrato e corridas assíncronas.
- Após as correções, não restaram achados Critical ou Important; ambos consideraram a Task 5 pronta para commit.
- Dívida Minor deferida: as cargas auxiliares iniciais de opções não fazem parte dos três fluxos com controller definidos no plano e ainda não possuem cancelamento/cobertura de unmount própria.

## Verificação

- `cd frontend && npm test`: 6 arquivos e 17 testes passaram.
- `cd frontend && npm run build`: build Vite passou com 707 módulos transformados.
- `git diff --check`: passou.
