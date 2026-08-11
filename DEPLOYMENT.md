# Publicação do checklistApp

## Backend com PM2

No ambiente local, o backend escuta em `localhost:7733` e é acessado pelo API
Gateway em `/api/checklist-app`.

```sh
cd backend
npm ci --omit=dev --no-audit
cd ..
pm2 start ecosystem.config.cjs
```

Quando o API Gateway estiver em Docker, inicie o backend com o perfil de
produção. Esse perfil escuta em `0.0.0.0:7733`, permitindo que o contêiner do
Gateway alcance o processo no host:

```sh
pm2 start ecosystem.config.cjs --env production
```

Restrinja a porta `7733` no firewall do host à rede Docker e às origens
administrativas necessárias; ela não deve ser publicada para clientes finais.

Em atualizações posteriores:

```sh
pm2 reload checklist-api
```

O arquivo `backend/.env` deve conter as credenciais do PostgreSQL, o schema
`checklist_app`, o `JWT_SECRET` compartilhado e as configurações de e-mail.

## Frontend no Apache

Crie `frontend/.env.production` a partir de `frontend/.env.example`, ajustando
as URLs públicas quando o ambiente deixar de usar localhost.

```sh
cd frontend
npm ci --no-audit
npm run build
```

Copie o conteúdo de `frontend/dist/` para o diretório configurado no Apache.
O exemplo em `deploy/apache-checklist.conf.example` publica esse conteúdo em
`/checklist/` e direciona rotas da SPA para `index.html`.

Antes de recarregar o Apache, valide a configuração com o comando adotado pelo
servidor. O módulo `rewrite` precisa estar habilitado.

## API Gateway

O Gateway encaminha:

```text
PM2 local: /api/checklist-app/* -> http://localhost:7733/*
Docker VPS: /api/checklist-app/* -> http://10.100.1.43:7733/*
```

Existe somente uma variável, `CHECKLIST_APP_SERVICE`. No `.env` usado pelo PM2
local ela aponta para `http://localhost:7733`; no `.env` carregado pelo Compose
da VPS ela deve apontar para `http://10.100.1.43:7733`, seguindo o mesmo padrão
dos demais backends PM2 documentados no ambiente.

Depois de compilar o Gateway, recarregue o processo PM2 local ou recrie o
contêiner conforme o procedimento operacional do ambiente.
