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
VITE_GATEWAY_URL=http://localhost:2399
```

Para o build publicado, use o host acessível pelo navegador:

```env
VITE_APP_BASE_URL=/<spa>/
VITE_GATEWAY_URL=http://<HOST_DA_VPS>:2399
```

Quando autenticação e API da aplicação passam pelo mesmo Gateway, exponha
somente sua origem em `VITE_GATEWAY_URL` e componha no código os prefixos
estáveis (`/api` e `/api/<app>/api`). Isso evita três variáveis representando o
mesmo serviço. Mantenha variáveis separadas apenas quando os serviços estiverem
em origens realmente diferentes. `VITE_APP_BASE_URL` não é redundante: ela
define o subcaminho público da SPA, não a origem das APIs.

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
```

Não mantenha caminhos alternativos por `DB_HOST`, `DB_USER`, `DB_PASSWORD` e
`DB_DATABASE`. Codifique caracteres reservados de usuário e senha no formato
URL. Não imprima, versione ou copie a URL real para destinos externos.

Quando cada aplicação possui um schema fixo, mantenha-o na configuração do ORM,
na entidade/modelo ou no código de acesso ao banco. Não exponha `DB_SCHEMA` no
`.env` apenas para repetir uma decisão fixa da aplicação. Testes descartáveis
podem receber um schema alternativo internamente.

Antes de criar ou executar migrations, detecte o mecanismo já usado pelo
repositório a partir das dependências, arquivos de configuração, scripts e
histórico existente. Preserve o stack encontrado:

| Stack encontrado | Conduta |
| --- | --- |
| TypeORM | Use o `DataSource`, CLI e scripts existentes; gere ou escreva migrations no diretório configurado |
| Prisma | Use o schema e o fluxo de migrations do Prisma já adotado pela aplicação |
| Runner SQL próprio | Preserve a tabela de controle, ordenação, checksums e comandos `db:*` implementados pelo projeto |
| Outro ORM/runner | Siga suas convenções existentes sem introduzir TypeORM, Prisma ou um runner paralelo |
| Projeto sem mecanismo | Escolha o mecanismo mais simples compatível com o stack atual; TypeORM é a preferência apenas quando ele já é a camada de persistência ou a convenção estabelecida do projeto |

Não adicione um segundo sistema de migrations a uma aplicação já funcional e
não converta o mecanismo existente apenas para uniformizar nomes de comandos.
Descubra os comandos reais em `package.json` e na configuração do projeto; não
presuma que existam `db:migrate`, `db:status`, `migration:run` ou `db:init`.

Independentemente da ferramenta, migrations aplicadas devem permanecer
imutáveis, novas mudanças devem ser incrementais e a ordem de deploy deve
aplicar alterações compatíveis antes de iniciar o backend que depende delas.
Inicialização destrutiva ou criação integral de schema só pode ser usada em
banco vazio e com o propósito confirmado. Quando houver infraestrutura,
valide a mudança em PostgreSQL descartável usando o mesmo mecanismo da
aplicação.

## Autenticação e perfis locais

Escolha explicitamente o modelo de ingresso antes de implementar. Não presuma
que todas as aplicações possuem o mesmo grau de abertura:

| Modelo | Use quando | Comportamento do primeiro login |
| --- | --- | --- |
| Fechado com pré-cadastro | Dados ou operações exigem autorização prévia | Retorna `403` e não cria usuário |
| Autoidentificação pendente | Qualquer colaborador pode solicitar acesso | Cria `PENDENTE` inativo e retorna `403` |

O Checklist usa o modelo fechado. Nele:

1. um administrador informa matrícula, papel e escopo operacional;
2. o backend consulta a fonte corporativa aprovada, como
   `DASS_AUTH_BASE_URL/colaborador/:matricula`, para validar e obter identidade;
3. o perfil local é criado ativo somente depois dessa validação;
4. no login, o JWT é validado e a matrícula precisa corresponder a um perfil
   local ativo;
5. uma matrícula desconhecida recebe `403` sem escrita no banco local.

No modelo de autoidentificação pendente:

1. o backend valida o JWT;
2. sincroniza por `upsert` somente campos de identidade confiáveis;
3. cria o perfil `PENDENTE` e inativo;
4. um administrador atribui papel e escopo e ativa o perfil;
5. logins posteriores não sobrescrevem autorização ou vínculos locais.

Nos dois modelos, não armazene senha, refresh token ou JWT no banco da
aplicação. Prefira cookie HTTP-only e nunca consulte diretamente o banco do
`dass_auth`.

### Login direto a partir do Portal Unix

Quando a aplicação e o Portal Unix compartilham o mesmo serviço de autenticação,
restaure a sessão central durante o bootstrap do frontend, antes de montar a
aplicação:

1. chame `POST /api/auth/me` com credenciais/cookies habilitados;
2. valide em seguida o perfil e a autorização local no backend da aplicação;
3. se ambos forem válidos, grave somente o perfil local necessário à interface
   e encaminhe o usuário para a área autenticada;
4. sem sessão central, apresente o login normalmente;
5. com sessão central válida, mas sem autorização local, apresente o login com
   uma mensagem de acesso não liberado e não crie perfil automaticamente no
   modelo fechado;
6. não execute logout central apenas porque uma aplicação recusou o acesso. O
   logout do Portal Unix deve ocorrer somente por ação explícita do usuário ou
   por invalidação da própria sessão central.

Os cookies de autenticação devem ser HTTP-only, enviados ao Gateway e possuir
escopo compatível com todas as aplicações integradas. Não use o `localStorage`
como prova da sessão central; ele pode guardar apenas estado derivado para a UI.
Uma aplicação com seleção obrigatória de unidade ou tenant precisa obter essa
informação do link/contexto de entrada ou solicitar a seleção antes de concluir
a autorização; não condicione um primeiro SSO a dados que só existiriam após um
login anterior naquela aplicação.

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

Use `CORS_ORIGINS` como nome canônico em serviços Node.js. O valor é uma lista
de origens exatas separadas por vírgula:

```env
CORS_ORIGINS=http://localhost:5173,http://<HOST_DA_VPS>
```

Origem significa apenas `protocolo://host:porta`, sem caminho e sem barra final.
`VITE_GATEWAY_URL` é o endereço que o navegador chama; `CORS_ORIGINS` é a lista
que o servidor aceita. Elas se relacionam, mas não são a mesma configuração.

Para imagens, fontes ou outros recursos autenticados que o frontend incorpora
por uma origem diferente, configure também `Cross-Origin-Resource-Policy` como
`cross-origin` na resposta específica do recurso. Não remova a proteção de toda
a API indiscriminadamente; `Access-Control-Allow-Origin` e credenciais continuam
responsáveis por controlar chamadas HTTP feitas pelo JavaScript.

Ao aplicar esta skill em uma aplicação existente, procure nomes legados como
`FRONTEND_ORIGIN`, `CORS_ORIGIN`, `ALLOWED_ORIGIN` e `ALLOWED_ORIGINS`. Se
representarem origens permitidas pelo CORS, migre para `CORS_ORIGINS` e atualize
na mesma mudança todos os consumidores, `.env.example`, testes, documentação e
manifestos de deploy. Preserve os valores existentes, converta valores únicos
em listas de um item e remova os nomes antigos após confirmar que não restaram
referências. Não mantenha aliases permanentes; use compatibilidade temporária
somente quando um deploy coordenado for impossível e documente sua remoção.

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
7. Implemente o modelo de ingresso escolhido: pré-cadastro ou perfil pendente.
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
- no modelo fechado: recusa sem cadastro, cadastro administrativo e login posterior;
- no modelo pendente: criação pendente e liberação administrativa;
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
| Login funciona; app `403` | Sem pré-cadastro ou perfil pendente/inativo | modelo escolhido e tabela local |
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
