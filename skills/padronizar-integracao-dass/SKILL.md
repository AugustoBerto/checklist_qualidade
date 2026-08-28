---
name: padronizar-integracao-dass
description: Padronizar ou integrar aplicações web no ambiente DASS com Vue/Vite, API Node.js, PM2, PostgreSQL, Apache, API Gateway e dass_auth. Use ao preparar uma aplicação nova, adequar uma existente ou diagnosticar seu deploy nesse ambiente.
---

# Padronizar integração de sistemas DASS

Entregue uma integração coerente, reproduzível e validada. Preserve as
convenções do projeto quando elas forem compatíveis com este ambiente; não
transplante código de outra aplicação sem verificar linguagem, artefato de build,
rotas e modelo de dados.

## Resultado esperado

Ao concluir, a aplicação deve ter:

- frontend publicado em um subcaminho estável do Apache;
- URLs de autenticação e negócio encaminhadas pelo API Gateway;
- backend com `npm run build`, health check e configuração PM2 local ao backend;
- PostgreSQL configurado exclusivamente por `DATABASE_URL` e migrations versionadas;
- autenticação corporativa pelo `dass_auth`, sem senha local;
- perfil local com menor privilégio e liberação administrativa;
- documentação de variáveis, deploy, rollback operacional e diagnóstico;
- evidência dos testes realmente executados e das lacunas restantes.

## Primeiro: descubra o contrato da aplicação

Inspecione o repositório e a configuração disponível antes de editar. Determine:

| Campo | Exemplo | Regra |
| --- | --- | --- |
| Nome lógico | `checklist-app` | Estável e sem colisão no Gateway |
| Prefixo da SPA | `/checklist/` | Deve coincidir em Vite, Apache e URL pública |
| Diretório Apache | `/var/www/.../html/checklist` | Deve conter todo o build |
| Porta da API | `7733` | Deve estar livre e registrada no Gateway |
| Prefixo do Gateway | `/api/checklist-app` | Deve ser específico e vir antes do catch-all |
| Rota interna da API | `/api` | Preserve se o backend já a utiliza |
| Nome PM2 | `checklist-api` | Não altere sem planejar a transição |
| Banco/schema | `banco` / `checklist_app` | Não confunda banco com schema |
| Origem do frontend | `http://host` | Deve ser exata quando houver credenciais |
| Admin inicial | matrícula | Necessário para bootstrap controlado |

Descubra esses valores em código, `.env.example`, configuração do Gateway,
Apache e listeners existentes. Nunca invente porta, prefixo, nome de serviço,
credencial ou caminho. Pergunte somente se um valor material não puder ser
determinado com segurança.

Antes de reutilizar uma porta ou prefixo, verifique colisões. Não altere outras
aplicações do VirtualHost ou do Gateway apenas para acomodar a nova integração.

## Topologia atual de referência

No ambiente observado:

```text
Navegador
  |-- /<spa>/ --------------------------------> Apache :80
  |-- http://<host>:2399/api/auth/* ----------> API Gateway
  `-- http://<host>:2399/api/<app>/api/* -----> API Gateway
                                                    |-- dass_auth :2123
                                                    `-- backend da aplicação
```

Considere portas e hosts como fatos a verificar, não constantes universais. No
ambiente atual, o Gateway atende em `2399` e o `dass_auth` em `2123`. O navegador
não deve chamar `2123`; autenticação pública passa pelo Gateway.

Uma URL como:

```text
/api/checklist-app/api/perfis/me
```

tem dois segmentos `api` por motivos diferentes:

- `/api/checklist-app` seleciona o serviço no Gateway;
- `/api/perfis/me` é a rota real do backend.

O Gateway remove o prefixo da aplicação e encaminha `/api/perfis/me`. Não
remova o segundo `/api` por estética nem crie uma reescrita excepcional sem uma
decisão arquitetural explícita.

## Frontend Vue/Vite

### Variáveis

Mantenha um `.env.example` sem segredos. Para desenvolvimento local:

```env
VITE_APP_BASE_URL=/<spa>/
VITE_AUTH_API_URL=http://localhost:2399/api
VITE_API_URL=http://localhost:2399/api/<app>/api
VITE_GATEWAY_URL=http://localhost:2399
```

Para o build publicado, use o host acessível pelo navegador:

```env
VITE_APP_BASE_URL=/<spa>/
VITE_AUTH_API_URL=http://<HOST_DA_VPS>:2399/api
VITE_API_URL=http://<HOST_DA_VPS>:2399/api/<app>/api
VITE_GATEWAY_URL=http://<HOST_DA_VPS>:2399
```

Nunca use `localhost` no bundle da VPS: ele apontaria para o computador do
usuário. Variáveis `VITE_*` são incorporadas no build; reinicie o servidor Vite
depois de alterá-las e gere/publice um novo bundle em produção.

### Base e router

Configure o Vite com a base pública e o Vue Router com a mesma base:

```js
base: env.VITE_APP_BASE_URL
```

```js
createWebHistory(import.meta.env.BASE_URL)
```

O prefixo precisa terminar com `/`. Verifique o `dist/index.html`: scripts,
estilos, favicons e imports dinâmicos devem apontar para o prefixo correto.
Publique todo o conteúdo de `dist`, não apenas `index.html`.

### Apache e History Mode

Quando a aplicação acessa diretamente o Gateway em `2399`, não adicione
`ProxyPass /api` ao Apache. Configure somente a SPA no `VirtualHost` correto:

```apache
Alias /<spa> /var/www/<site>/html/<spa>

<Directory "/var/www/<site>/html/<spa>">
    Options FollowSymLinks
    AllowOverride None
    Require all granted
    DirectoryIndex index.html
    FallbackResource /<spa>/index.html

    <Files "index.html">
        Header always set Cache-Control "no-store, no-cache, must-revalidate"
    </Files>
</Directory>
```

Não habilite `Indexes` sem necessidade. Mantenha a diretiva `Header` em uma
linha. Antes de reload ou restart:

```bash
httpd -t
```

Prossiga somente com `Syntax OK`. Um restart com configuração inválida pode
deixar o serviço indisponível.

## Backend Node.js

### Scripts npm

Todo backend deve aceitar `npm run build`, mas o comando precisa refletir o
artefato real:

- TypeScript: gere `dist` com o compilador e dependências necessárias;
- JavaScript executado diretamente: faça ao menos validação de sintaxe, sem
  fingir que existe um `dist`;
- não copie o script PM2 de um backend TypeScript para um backend JavaScript.

Exemplo JavaScript:

```json
{
  "scripts": {
    "build": "node --check index.js",
    "start": "node index.js"
  }
}
```

### Health check

Exponha um health check público que valide a dependência principal:

```text
GET /api/health
200 { "status": "ok", "database": "up" }
503 { "status": "degraded", "database": "down" }
```

Não inclua credenciais, stack traces ou detalhes internos na resposta.

### PM2

Mantenha `ecosystem.config.cjs` dentro de `backend/`, pois somente a API é
gerenciada pelo PM2:

```js
module.exports = {
  apps: [
    {
      name: '<nome-estavel>',
      cwd: __dirname,
      script: './index.js', // ou o arquivo real sob ./dist
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      time: true,
      max_memory_restart: '1G',
    },
  ],
}
```

Use `.env` para configuração da aplicação, sem segredos no ecosystem. Antes
de iniciar PM2, encerre o processo de desenvolvimento que ocupa a mesma porta.

## PostgreSQL e migrations

Use exclusivamente:

```env
DATABASE_URL=postgresql://<USUARIO>:<SENHA>@<HOST>:5432/<BANCO>
DB_SCHEMA=<schema_da_aplicacao>
```

Não mantenha caminhos alternativos por `DB_HOST`, `DB_USER`, `DB_PASSWORD` e
`DB_DATABASE`. Codifique caracteres reservados de usuário e senha no formato
URL. Não imprima, versione ou copie a URL real para destinos externos.

Migrations devem ser incrementais, ordenadas, imutáveis depois de aplicadas e
registradas com checksum. Para instalação existente:

```bash
npm run db:migrate
npm run db:status
```

Use `db:init` somente em banco/schema vazio. Aplique migrations compatíveis
antes de iniciar uma versão do backend que dependa delas. Valide mudanças de
schema em PostgreSQL descartável quando houver infraestrutura de integração.

## Autenticação e perfis locais

Adote provisionamento just-in-time com menor privilégio:

1. o frontend autentica em `/api/auth/login` pelo Gateway;
2. o `dass_auth` valida a credencial e emite JWT/cookies;
3. o backend valida a assinatura com a chave compartilhada;
4. matrícula, nome, função e demais campos confiáveis do JWT são sincronizados
   por `upsert` na tabela local;
5. um novo perfil nasce `PENDENTE` e inativo;
6. enquanto pendente/inativo, qualquer rota de negócio retorna `403`;
7. um administrador atribui papel e escopo operacional e ativa o perfil;
8. logins posteriores atualizam identidade corporativa sem sobrescrever papel,
   estado ou vínculos definidos localmente.

Não armazene senha, refresh token ou JWT no banco da aplicação. Prefira
cookie HTTP-only. Não consulte diretamente o banco do `dass_auth` nem sua rota
`/colaborador/:matricula` quando os dados necessários já existem no JWT.

Para bootstrap, permita que uma única matrícula configurada assuma o primeiro
`ADMIN` somente enquanto nenhum perfil estiver configurado. Proteja a operação
contra concorrência e impeça desativar ou rebaixar o último administrador ativo.

Papéis são específicos da aplicação. Não converta automaticamente cargo
corporativo em permissão privilegiada; nome de função não é uma fronteira de
autorização confiável.

### CORS e cookies

Chamadas de `:80` para `:2399` são cross-origin. O Gateway e os serviços devem
aceitar a origem exata do frontend e credenciais. Não combine:

```text
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
```

Evite adicionar `Access-Control-Allow-Origin: *` globalmente no Apache. Não
altere um cabeçalho compartilhado sem avaliar as outras aplicações do
VirtualHost.

## API Gateway

Registre um prefixo específico, por exemplo `/api/<app>`, associado a uma
variável de serviço:

```env
<APP>_SERVICE=http://<host-alcancavel-pelo-gateway>:<porta>
```

Se Gateway e backend estiverem em contextos diferentes, `localhost` pode estar
errado. Dentro de Docker, use DNS/rede do container; do container para processo
no host, use o endereço alcançável e confirme o listener. Registre rotas
específicas antes do catch-all `/api`, que normalmente aponta ao `dass_auth`.

O proxy deve preservar método, corpo, query, cookies, `Set-Cookie`, status e
cabeçalhos relevantes. Remova apenas o prefixo registrado para a aplicação.

## Sequência de implementação

1. Registre o contrato descoberto: nomes, prefixos, portas, banco, schema e
   origens.
2. Inspecione o fluxo real do frontend ao banco e os consumidores das rotas.
3. Alinhe variáveis e exemplos sem versionar segredos.
4. Implemente health check, build e PM2 coerentes com o runtime.
5. Registre o serviço no Gateway sem colidir com o catch-all.
6. Configure base/URLs do frontend e fallback da SPA.
7. Implemente ou adeque autenticação e perfis pendentes.
8. Crie migrations para mudanças de banco; não edite migrations aplicadas.
9. Atualize documentação da aplicação e `.env.example`.
10. Valide cada camada e depois o caminho completo.

Não execute restart, mudança de produção, migration destrutiva ou alteração
compartilhada sem a autorização correspondente. Preserve mudanças alheias no
workspace.

## Validação

Execute os comandos reais do projeto. Como base:

```bash
# Backend
npm ci
npm run build
npm test
npm run db:migrate
npm run db:status

# Frontend
npm ci
npm test
npm run build
```

Valide a infraestrutura em camadas:

```bash
curl -i http://<host-backend>:<porta>/api/health
curl -i http://127.0.0.1:2399/api/<app>/api/health
curl -i -X POST http://127.0.0.1:2399/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Resultados esperados: health direto e pelo Gateway em `200`; login vazio em
`400`, comprovando que chegou ao `dass_auth`. Teste ainda:

- raiz da SPA;
- carregamento de JS/CSS sem `404`;
- `F5` em rota interna;
- login real e restauração de sessão;
- criação de perfil pendente;
- liberação por administrador;
- acesso autorizado depois da liberação;
- acesso administrativo recusado para papéis comuns.

Não declare um teste como aprovado se ele não foi executado. Se integração
com banco, Gateway ou VPS não estiver disponível, registre exatamente a lacuna.

## Diagnóstico orientado pelo emissor

Identifique quem produziu a resposta antes de alterar configuração:

| Sintoma | Causa provável | Verificação inicial |
| --- | --- | --- |
| Tela branca; assets `404` | Base Vite diferente do `Alias` | `dist/index.html`, URL e diretório publicado |
| `F5` retorna Apache `404` | Ausência de fallback SPA | `FallbackResource` no `<Directory>` correto |
| `/api/auth/login` retorna Apache `404` | Bundle usa URL relativa sem proxy | URL compilada e estratégia Gateway direto/proxy |
| Gateway `504` | Destino lento/inacessível | Health direto, listener e URL registrada |
| Gateway `502` | Conexão recusada/host errado | Interface de bind e rede host/container |
| API health `503` | PostgreSQL indisponível | `DATABASE_URL`, rede, banco, permissões e schema |
| API `500` após deploy | Migration/configuração incompatível | logs, `db:status`, ordem do deploy |
| Login funciona; app `403` | Perfil pendente/inativo | tabela local e fluxo de liberação |
| PM2 reinicia | porta, `.env`, artefato ou startup | `pm2 logs`, listener, script configurado |

Um `404` com HTML e `Server: Apache` não é erro do backend. Um erro devolvido
pelo Gateway confirma que a requisição passou pelo frontend/Apache. Use essa
distinção para investigar a camada mais barata primeiro.

## Entrega do agente

Ao finalizar, informe de forma objetiva:

- contrato adotado (prefixos, portas, nome PM2, banco/schema), sem segredos;
- arquivos alterados e decisões que afetam integração;
- migrations adicionadas e ordem segura de deploy;
- comandos de configuração/deploy que o operador ainda precisa executar;
- testes executados e resultados reais;
- riscos, dependências externas ou validações pendentes.

## Evolução desta skill

Ao incorporar uma nova regra, registre apenas conhecimento confirmado e
reutilizável. Diferencie:

- **invariante do ambiente:** deve ser obedecida por todas as aplicações;
- **padrão recomendado:** pode variar quando o projeto justificar;
- **exemplo:** ilustra uma aplicação e não deve virar regra por acidente.

Atualize portas, topologia ou contratos somente após verificar a configuração
ativa. Quando a skill crescer a ponto de carregar detalhes irrelevantes para a
maioria das tarefas, mova procedimentos condicionais para `references/` e
mantenha aqui o roteamento para eles.

