# Operação do Checklist

Este guia reúne instalação, desenvolvimento, deploy e manutenção da aplicação.
Ele não documenta serviços corporativos fora deste repositório.

## Configuração local

Pré-requisitos: Node.js com npm, PostgreSQL acessível, Gateway e `dass_auth`.
Docker é necessário apenas para o teste de integração do backend.

```bash
cd backend
cp .env.example .env
npm ci
npm run db:init       # somente em banco/schema vazio
npm run db:migrate
npm run dev
```

Em outro terminal:

```bash
cd frontend
cp .env.example .env
npm ci
npm run dev
```

O frontend abre em `http://localhost:5173/checklist/`. O HMR permanece
desativado para evitar congelamentos no ambiente Windows/WSL; atualize a página
manualmente após uma alteração.

### Variáveis relevantes

| Unidade | Variável | Uso |
| --- | --- | --- |
| Backend | `DATABASE_URL` | Obrigatória; conexão PostgreSQL principal. |
| Backend | `JWT_SECRET` | Obrigatória; mesma chave do `dass_auth`. |
| Backend | `CHECKLIST_INITIAL_ADMIN_MATRICULA` | Bootstrap controlado do primeiro `ADMIN`. |
| Backend | `HOST`, `PORT`, `CORS_ORIGINS`, `DASS_AUTH_BASE_URL` | Listener, CORS e consulta administrativa à identidade corporativa. |
| Frontend | `VITE_APP_BASE_URL` | Base pública; `/checklist/` na VPS. |
| Frontend | `VITE_GATEWAY_URL` | Origem pública do Gateway. |

Não versione `.env`, tokens, senhas, chaves ou uma `DATABASE_URL` real. Valores
`VITE_*` são incorporados ao bundle durante o build; alterá-los depois não muda
a versão publicada.

## Primeiro acesso

1. Configure o mesmo `JWT_SECRET` no Checklist e no `dass_auth`.
2. Defina `CHECKLIST_INITIAL_ADMIN_MATRICULA`.
3. Entre com a conta corporativa dessa matrícula.
4. Enquanto não houver perfil local configurado, somente ela cria o primeiro
   `ADMIN`.
5. Esse administrador cadastra previamente os demais perfis locais.

O `dass_auth` autentica e mantém os cookies HTTP-only. O Checklist valida o JWT
e decide autorização pelo perfil local; não armazena senha corporativa nem
refresh token.

## Testes e manutenção

```bash
cd backend
npm test
npm run test:integration  # PostgreSQL descartável via Docker
npm run db:status
npm run evidencias:cleanup

cd ../frontend
npm test
npm run build
```

`db:init` recusa schema existente. Em instalações já inicializadas, use apenas
`db:migrate`; não modifique migrations aplicadas, pois os checksums são
verificados. Agende `evidencias:cleanup` para remover bytes expirados e manter
os metadados históricos.

## Deploy na VPS

O contrato desta aplicação é:

| Item | Valor |
| --- | --- |
| Frontend | `/checklist/` → `/var/www/dasssest.com/html/checklist` |
| API | porta `7733`, PM2 `checklist-api` |
| Gateway | prefixo público `/api/checklist-app/api` |
| Banco | schema `checklist_app` |

Antes do deploy do frontend, configure no ambiente da VPS:

```env
VITE_APP_BASE_URL=/checklist/
VITE_GATEWAY_URL=http://<HOST_PUBLICO>
```

O valor de `VITE_GATEWAY_URL` deve ser a origem pública do site, sem a porta
interna do Gateway. Para a VPS local deste projeto, o valor é
`http://10.100.1.43`.
Se o usuário abrir o site por um domínio, use esse mesmo domínio no valor da
variável; host, esquema (`http`/`https`) e porta pública precisam coincidir para
que o navegador trate a API como mesma origem.

Execute:

```bash
cd frontend
npm ci
npm test
npm run deploy
```

`npm run deploy` cria `dist/` e promove a árvore completa de forma atômica para
o diretório Apache. A versão anterior fica disponível até a nova estar pronta;
assets antigos são removidos após a troca. Use `FRONTEND_PUBLISH_DIR` somente
para um destino alternativo explicitamente autorizado.

O Apache precisa servir assets reais e devolver o `index.html` para rotas da
SPA. No `VirtualHost` aplicável:

```apache
Alias /checklist /var/www/dasssest.com/html/checklist

# O Gateway permanece interno; /api/ é publicado na mesma origem do frontend.
ProxyPreserveHost On
ProxyPass        /api/ http://127.0.0.1:2399/api/
ProxyPassReverse /api/ http://127.0.0.1:2399/api/

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

O VirtualHost precisa ter os módulos `mod_proxy` e `mod_proxy_http` carregados.
Se o site usar HTTPS, mantenha o proxy no VirtualHost HTTPS e configure o
frontend com `VITE_GATEWAY_URL=https://<HOST_PUBLICO>` para evitar conteúdo
misto. Não remova a exposição atual da porta `2399` antes de validar o fluxo
pela rota pública `/api/` e confirmar que não existem consumidores externos.

Após alterar essa configuração, valide e recarregue o Apache:

```bash
httpd -t
systemctl reload httpd
```

Para a API, aplique migrations antes de iniciar a nova versão e use o manifesto
PM2 do repositório:

```bash
cd backend
npm ci
npm run build
npm test
npm run db:migrate
pm2 startOrReload ecosystem.config.cjs
```

## Verificação e diagnóstico

- `GET /api/health` retorna `200` com banco disponível e `503` quando degradado.
- Recarregar `/checklist/login` deve devolver a SPA; arquivos em
  `/checklist/assets/` devem ser JavaScript/CSS reais, não `index.html`.
- `403` após login indica perfil local ausente, inativo ou sem papel suficiente.
- `502` pelo Gateway indica conferir listener da API e o serviço registrado.
- Se a SPA chamar destino incorreto, confira as duas variáveis `VITE_*` e gere
  um novo build.

Antes de concluir um deploy, teste a raiz, uma rota recarregada, login, health
pelo Gateway e uma operação autenticada.
