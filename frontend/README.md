# ChecklistApp Frontend

Interface Vue do sistema de checklist. As chamadas ao backend usam
`VITE_API_URL` e a autenticação central usa `VITE_AUTH_API_URL` ou `/api`.

## Desenvolvimento

```bash
npm install
npm run dev
```

Para o ambiente local, mantenha o proxy Vite apontando para o Gateway em
`VITE_GATEWAY_URL=http://localhost:2399`. A aplicação pode ser hospedada em
subcaminho com `VITE_APP_BASE_URL=/checklist/`.

## Validação

```bash
npm run build
```
