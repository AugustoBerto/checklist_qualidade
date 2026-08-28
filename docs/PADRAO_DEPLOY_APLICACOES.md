# Padrão de deploy de aplicações web

Este roteiro padroniza aplicações Vue, APIs Node.js gerenciadas por PM2, API
Gateway corporativo, Apache HTTP Server e PostgreSQL. Substitua nomes, portas e
prefixos pelos valores registrados para cada aplicação.

## Contrato de publicação

Defina antes do build:

| Item | Exemplo do Checklist |
| --- | --- |
| Prefixo do frontend | `/checklist/` |
| Diretório Apache | `/var/www/dasssest.com/html/checklist` |
| Porta da API | `7733` |
| Prefixo no Gateway | `/api/checklist-app` |
| Porta do Gateway | `2399` |
| Nome PM2 | `checklist-api` |
| Schema PostgreSQL | `checklist_app` |

O prefixo configurado no Vite, o `Alias` do Apache e a URL acessada pelo
navegador precisam coincidir. Divergência entre `/checklist/` e outro nome gera
HTML sem JavaScript/CSS e respostas `404` em `/assets`.

## Frontend

Use URLs absolutas do Gateway no `.env` utilizado pelo build da VPS:

```env
VITE_APP_BASE_URL=/checklist/
VITE_AUTH_API_URL=http://<HOST_DA_VPS>:2399/api
VITE_API_URL=http://<HOST_DA_VPS>:2399/api/checklist-app/api
VITE_GATEWAY_URL=http://<HOST_DA_VPS>:2399
```

As variáveis `VITE_*` são incorporadas ao bundle. Alterar o arquivo depois do
build não corrige arquivos já publicados.

```bash
cd frontend
npm ci
npm test
npm run build
```

Confira `dist/index.html` e publique todo o conteúdo de `dist`, inclusive
`assets/`. Para uma SPA em History Mode, configure o Apache dentro do
`VirtualHost` correspondente:

```apache
Alias /checklist /var/www/dasssest.com/html/checklist

<Directory "/var/www/dasssest.com/html/checklist">
    Options FollowSymLinks
    AllowOverride None
    Require all granted
    DirectoryIndex index.html
    FallbackResource /checklist/index.html

    <Files "index.html">
        Header always set Cache-Control "no-store, no-cache, must-revalidate"
    </Files>
</Directory>
```

Mantenha a diretiva `Header` em uma linha. Sempre valide antes de recarregar:

```bash
httpd -t
systemctl reload httpd
```

`F5` em `/checklist/login` deve retornar o `index.html`, enquanto arquivos reais
em `/checklist/assets/` devem ser servidos diretamente.

## Backend e banco

Adote uma única URL de conexão e não combine `DATABASE_URL` com variáveis
`DB_HOST`, `DB_USER` ou equivalentes:

```env
DATABASE_URL=postgresql://<USUARIO>:<SENHA>@<HOST>:5432/<BANCO>
DB_SCHEMA=checklist_app
HOST=0.0.0.0
PORT=7733
FRONTEND_ORIGIN=http://<HOST_DA_VPS>
JWT_SECRET=<MESMA_CHAVE_DO_DASS_AUTH>
CHECKLIST_INITIAL_ADMIN_MATRICULA=<MATRICULA>
```

Não registre nem imprima a URL real, pois ela pode conter credenciais. Prepare
uma versão nova nesta ordem. Codifique caracteres reservados de usuário e senha
no formato URL antes de montar `DATABASE_URL`:

```bash
cd backend
npm ci
npm run build
npm test
npm run db:migrate
npm run db:status
```

Em banco/schema vazio, execute `npm run db:init` antes de `db:migrate`. Nunca
edite uma migration aplicada; crie a próxima versão.

O arquivo `backend/ecosystem.config.cjs` deve usar `cwd: __dirname`, um nome PM2
estável e o artefato real da aplicação. JavaScript executa `./index.js`;
TypeScript compilado normalmente executa um arquivo sob `./dist`.

```bash
pm2 startOrReload ecosystem.config.cjs
pm2 status
pm2 logs checklist-api --lines 100 --nostream
pm2 save
```

## Gateway e autenticação

Registre o backend no Gateway, por exemplo:

```env
CHECKLIST_APP_SERVICE=http://<HOST_DA_API>:7733
```

O navegador usa o Gateway para autenticação e para a API da aplicação. O
backend valida o JWT com a chave compartilhada, mas não recebe nem armazena a
senha corporativa.

O padrão de usuários é provisionamento no primeiro acesso com menor privilégio:

1. o `dass_auth` autentica e emite o JWT;
2. a aplicação valida o token;
3. identidade corporativa é criada/atualizada localmente;
4. o novo perfil fica `PENDENTE` e inativo;
5. um administrador atribui papel e escopo operacional e ativa o perfil;
6. somente então as rotas de negócio são liberadas.

Isso evita consulta direta ao banco ou API interna de autenticação e impede
que o simples vínculo corporativo conceda permissão na aplicação.

## Validação ponta a ponta

```bash
curl -i http://<HOST_DA_API>:7733/api/health
curl -i http://127.0.0.1:2399/api/checklist-app/api/health
curl -i -X POST http://127.0.0.1:2399/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{}'
```

O health deve retornar `200` e `database: up`. O login vazio deve retornar
`400`, comprovando que a requisição chegou ao serviço de autenticação.

## Diagnóstico rápido

| Sintoma | Verificação |
| --- | --- |
| Tela branca e `404` em assets | Prefixo do Vite, `Alias`, conteúdo completo de `dist` |
| `F5` em rota retorna `404` | `FallbackResource` no `<Directory>` da SPA |
| `/api/auth/login` retorna `404` do Apache | Build usa URL relativa; use o Gateway absoluto ou configure proxy conscientemente |
| Gateway retorna `502` | Listener da API e URL do serviço registrada no Gateway |
| Health retorna `503` | `DATABASE_URL`, rede, permissões, banco e schema |
| PM2 reinicia continuamente | `pm2 logs`, `.env`, migration pendente, porta ocupada |
| Login funciona, aplicação retorna `403` | Perfil pendente/inativo ou papel insuficiente |

Antes de declarar o deploy concluído, teste a raiz da SPA, uma rota interna com
recarregamento, login, health pelo Gateway e uma operação autenticada da API.
