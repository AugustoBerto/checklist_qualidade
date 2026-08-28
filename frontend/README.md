# ChecklistApp Frontend

Interface Vue do sistema de checklist. As chamadas ao backend e à autenticação
central usam a origem definida em `VITE_GATEWAY_URL`; os prefixos estáveis das
rotas são centralizados no código.

## Desenvolvimento local no WSL

```bash
npm install
npm run dev
```

O frontend abre em `http://localhost:5173/checklist/`. O HMR está desativado
para evitar o congelamento identificado no ambiente Windows/WSL. Após alterar o
código, atualize a página manualmente com F5.

## Build de produção local

```bash
npm start
```

Esse comando recompila o frontend e o serve em
`http://localhost:4173/checklist/`, sem recursos de desenvolvimento. Use-o para
validar o mesmo tipo de bundle que será usado na VPS.

Para o ambiente local, use `http://localhost:2399` nas URLs do Gateway. Na VPS,
substitua `localhost` pelo host público antes do build. A aplicação pode ser
hospedada em subcaminho com `VITE_APP_BASE_URL=/checklist/`.

## Validação

```bash
npm run build
npm test
```
