# Como Gateway, dass_auth e aplicações trabalham juntos

Este documento explica o caminho de uma requisição no ambiente local e na futura VPS.

## Visão rápida

```text
Navegador
   |
   | /api/auth/...                 /api/checklist-app/...
   v
api-gateway (porta 2399)
   |                                      |
   v                                      v
dass_auth_service (porta 2123)       Checklist API (porta 7733)
   |                                      |
   v                                      v
autenticacao.usuarios                checklist_app.usuarios
```

O Gateway não autentica e não decide permissões. Ele recebe a requisição, escolhe o serviço de destino pelo prefixo da URL, remove esse prefixo e encaminha método, corpo, query string, cookies, cabeçalhos, status e resposta.

Exemplo: `POST /api/checklist-app/api/perfis/me` chega ao Gateway. A rota configurada `/api/checklist-app` usa `CHECKLIST_APP_SERVICE`; o Gateway remove `/checklist-app` e o Checklist recebe `POST /api/perfis/me`.

Rotas sem um prefixo explícito usam `MAIN_SERVICE`. No ambiente atual, ele aponta para o `dass_auth_service`. Assim, `POST /api/auth/login` chega ao dass_auth como `POST /auth/login`.

## O que o dass_auth faz

O `dass_auth_service` é a fonte central de identidade e sessão. Ele não é apenas uma tela de login.

Ele consulta `autenticacao.usuarios` para localizar o colaborador, confere a senha, cria tokens, mantém refresh tokens, encerra sessões e disponibiliza dados corporativos básicos para as aplicações.

### Dados usados no token

Após autenticar, o dass_auth cria um JWT com dados como:

- `id` e `usuario` corporativos;
- `matricula`;
- `nome`, `funcao`, `setor` e `unidade`;
- `nivel` corporativo;
- código de barras e RFID, quando disponíveis.

O token é assinado com `JWT_SECRET`/`PRIVATE_KEY`. As aplicações que precisam validá-lo devem usar a mesma chave, mas nunca devem armazenar ou comparar senha corporativa.

### Rotas de autenticação realmente usadas

| Rota pública pelo Gateway | Rota recebida pelo dass_auth | Função |
| --- | --- | --- |
| `POST /api/auth/login` | `POST /auth/login` | Autentica `usuario` e `senha` contra `autenticacao.usuarios`. |
| `POST /api/auth/me` | `POST /auth/me` | Valida a sessão atual e, se necessário, usa o refresh token para emitir novos cookies. |
| `POST /api/auth/token/refresh` | `POST /auth/token/refresh` | Renova explicitamente access e refresh tokens. |
| `POST /api/auth/logout` | `POST /auth/logout` | Coloca o token em blacklist, consome o refresh token e limpa os cookies. |

No login, o dass_auth devolve os cookies HTTP-only `token` e `refreshToken`. O navegador não lê esses cookies com JavaScript; ele os envia automaticamente nas próximas chamadas para o mesmo domínio/origem permitida. O Gateway apenas repassa os cabeçalhos `Set-Cookie` ao navegador e os cookies recebidos ao dass_auth ou à aplicação.

### Sessão e renovação

1. O frontend chama `POST /api/auth/login` com usuário e senha.
2. Gateway encaminha ao dass_auth.
3. O dass_auth valida `autenticacao.usuarios`, assina o JWT e cria um refresh token persistido pelo serviço.
4. O navegador recebe `token` e `refreshToken` como cookies HTTP-only.
5. Em uma recarga da página, o frontend chama `POST /api/auth/me`.
6. Se o access token ainda é válido, o dass_auth devolve os dados da sessão. Se expirou e o refresh token é válido, ele gera novos cookies e devolve a sessão atualizada.
7. No logout, o dass_auth invalida os tokens e limpa os cookies.

Portanto, o dass_auth faz autenticação, emissão e renovação de sessão, logout/invalidação e consulta da identidade corporativa. Ele **não** conhece as regras específicas de cada aplicação.

## O que cada aplicação faz depois do login

Cada aplicação mantém as próprias regras de negócio e autorização. O JWT prova quem é a pessoa; a aplicação decide o que ela pode fazer no seu domínio.

No Checklist:

1. Depois de `POST /api/auth/login`, o frontend chama `GET /api/checklist-app/api/perfis/me`.
2. O cookie `token` chega ao Checklist através do Gateway.
3. O middleware do Checklist valida a assinatura do JWT com o mesmo `JWT_SECRET` do dass_auth.
4. A aplicação lê a `matricula` do token e procura o perfil local em `checklist_app.usuarios`.
5. A identidade do JWT é criada ou atualizada no banco local.
6. Um novo colaborador recebe `papel=PENDENTE` e `ativo=0`.
7. Enquanto estiver pendente ou inativo, a aplicação retorna `403 PERFIL_CHECKLIST_PENDENTE`; o frontend informa o bloqueio e faz logout central.
8. Um administrador atribui `ADMIN`, `LIDER` ou `INSPETOR`, configura os vínculos operacionais e ativa o perfil.
9. Quando liberado, o Checklist responde com os dados permitidos e aplica as regras da rota.

O primeiro perfil `ADMIN` é uma exceção controlada: enquanto todos os perfis
existentes estiverem pendentes, apenas a matrícula definida em
`CHECKLIST_INITIAL_ADMIN_MATRICULA` pode assumir esse papel no primeiro acesso.

## Quem pede e quem responde

| Situação | Quem pede | Caminho | Quem responde |
| --- | --- | --- | --- |
| Login por senha | Frontend | Gateway → dass_auth → `autenticacao.usuarios` | dass_auth, com cookies de sessão |
| Restaurar sessão | Frontend | Gateway → dass_auth | dass_auth, validando/renovando tokens |
| Ver perfil do Checklist | Frontend | Gateway → Checklist → `checklist_app.usuarios` | Checklist |
| Sincronizar perfil local | Colaborador autenticado | Gateway → Checklist → banco local, usando os dados do JWT | Checklist |
| Salvar checklist | Frontend | Gateway → Checklist | Checklist, depois de validar cookie e perfil |
| Logout | Frontend | Gateway → dass_auth | dass_auth, invalidando e limpando sessão |

## Dados que não devem circular ou ser duplicados

- Senha corporativa: somente o dass_auth acessa `autenticacao.usuarios.senha`.
- Refresh token: somente o dass_auth cria, consulta e consome.
- JWT: fica em cookie HTTP-only; o frontend não deve salvar em `localStorage`.
- Papel do Checklist: é local em `checklist_app.usuarios`; o dass_auth não decide se alguém é ADMIN, LIDER ou INSPETOR do Checklist.

## Regra prática para novas aplicações

Para uma nova aplicação integrada:

1. Registrar um prefixo no Gateway, por exemplo `/api/minha-app`, e configurar a URL do serviço.
2. Usar `/api/auth/*` para login, restauração e logout, sem criar senha local.
3. Validar o cookie/JWT central no backend usando a chave compartilhada.
4. Criar uma tabela local de perfis/permissões se a aplicação tiver papéis próprios.
5. Não usar o Gateway como lugar de regra de negócio; ele é somente o ponto de entrada e proxy.

Isso permite que uma pessoa use uma única credencial corporativa e, ao mesmo tempo, tenha permissões diferentes em cada aplicação.
