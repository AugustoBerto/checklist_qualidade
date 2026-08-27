# Task 1 — fronteira HTTP segura e previsível

## Implementação

- `backend/index.js`: exporta `app`, só inicia o listener quando executado diretamente, aceita `null` no parser JSON e normaliza `req.body === null` para `{}`. Falhas inesperadas agora são registradas no servidor e respondem JSON 500 sem stack. A rota `/api/test/error` existe apenas com `NODE_ENV=test`, para testar o middleware sem expor endpoint em produção. O segredo placeholder antigo é recusado no startup.
- `backend/middlewares/auth.js`: `URIError` de cookie percent-encoded inválido vira resposta JSON 401 de token inválido.
- `backend/.env.example`: `JWT_SECRET` ficou vazio.
- `backend/test/auth.test.js`: regressão do cookie inválido.
- `backend/test/http-errors.test.js`: testes HTTP do cookie inválido, erro inesperado e corpo literal `null`; usa `app.handle` com request/response nativos simulados porque o sandbox não permite abrir socket TCP. A decisão mantém o comportamento real do Express sem rota de teste em produção.

## Evidência RED

Com os testes adicionados e antes da produção, `cd backend && npm run test:unit` falhou: 3 testes passaram e 2 arquivos falharam (`auth.test.js` e `http-errors.test.js`). O cookie inválido propagava `URIError`; a aplicação ainda não era exportada/isolável e não fornecia o contrato 500 JSON.

## Evidência GREEN e validação

- `cd backend && node --test --test-reporter spec test/auth.test.js test/http-errors.test.js`: 2 arquivos passaram.
- `cd backend && git diff --check`: passou.
- `cd backend && node --check index.js && node --check middlewares/auth.js`: passou.
- `cd backend && JWT_SECRET=supersecretjwtkey12345 node -e "require('./index')"`: falhou no startup com `JWT_SECRET não pode usar o valor padrão do exemplo.`; rejeição confirmada.
- `cd backend && npm run test:unit`: 5 arquivos passaram, 0 falhas.

## Auto-review

- Contratos existentes de 413, JSON inválido e 404 foram preservados.
- A rota de erro é exclusiva de teste; nenhum endpoint novo é exposto fora de `NODE_ENV=test`.
- Não foram adicionadas dependências, nem stack foi enviada ao cliente.
- O parser JSON agora aceita valores primitivos para poder receber o literal `null`; somente `null` é normalizado globalmente conforme o contrato.
