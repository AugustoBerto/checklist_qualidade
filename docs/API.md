# Referência da API

## Convenções

Em acesso direto, a API usa a base `/api`. Pelo Gateway configurado para a
aplicação, a base pública padrão é `/api/checklist-app/api`.

Com exceção de `GET /health`, todas as rotas exigem o cookie HTTP-only `token`.
Erros usam, em geral:

```json
{ "sucesso": false, "mensagem": "Descrição do erro." }
```

Respostas comuns incluem `400` para entrada inválida, `401` para sessão ausente
ou expirada, `403` para perfil/permissão insuficiente, `404` para recurso ausente,
`409` para conflito, `413` para imagem/corpo excedente e `500` para erro interno.

## Rotas gerais e perfis

| Método e rota | Papel | Finalidade |
| --- | --- | --- |
| `GET /health` | Público | Verifica API e banco. |
| `GET /perfis/me` | Autenticado | Retorna identidade combinada com o perfil local. |
| `GET /perfis` | `ADMIN` | Lista perfis locais. |
| `POST /perfis` | `ADMIN` | Cria perfil após validar a matrícula no `dass_auth`. |
| `PUT /perfis/:id` | `ADMIN` | Atualiza papel, estado e vínculos operacionais. |

Criação de perfil exige `matricula`, `papel` e os quatro campos de vínculo
`id_unidade_fk`, `id_setor_fk`, `id_celula_fk`, `id_turno_fk`, cada um com ID
válido ou `null`. Papéis válidos: `ADMIN`, `LIDER` e `INSPETOR`. Atualização
exige `papel`, `ativo` e os mesmos campos de vínculo.

A API impede desativar ou rebaixar o último administrador ativo. Essa tentativa
retorna `409` com o código `ULTIMO_ADMIN`.

## Execução e relatórios

| Método e rota | Finalidade |
| --- | --- |
| `GET /dados/modelos` | Lista modelos ativos, filtráveis por marca e setor. |
| `GET /checklists/perguntas/:modelo` | Perguntas ativas agrupadas por categoria. |
| `POST /checklists/salvar` | Valida e cria uma submissão. |
| `GET /submissoes` | Lista submissões paginadas e filtradas. |
| `GET /submissoes/:id` | Detalhe completo, evidências, assinatura e pontuação. |
| `GET /relatorios/:id` | Metadados e dataset do gráfico de conformidade. |

Filtros de `GET /dados/modelos`: `marca_id` e `setor_id`.

O retorno de perguntas inclui `modelo: { id, nome, versao }`. A versão identifica
a estrutura carregada e permite descartar rascunhos incompatíveis.

Filtros de `GET /submissoes`: `page` (padrão 1), `pageSize` (padrão 25,
máximo 100), `dataInicio`, `dataFim`, `marca`, `modeloId`, `setorId`, `celulaId`,
`busca` e `usuario`. Quando `busca` é informado, ele substitui o filtro isolado
por usuário e pesquisa também modelo, célula e setor.

Exemplo mínimo do corpo de uma submissão:

```json
{
  "id_modelo": 12,
  "id_setor": 3,
  "id_celula": 8,
  "inicio_checklist": "2026-08-28T12:30:00.000Z",
  "assinatura": "data:image/png;base64,...",
  "respostas": [
    { "id_pergunta": 41, "resposta": "Conforme" },
    {
      "id_pergunta": 42,
      "resposta": "Não Conforme",
      "observacao": "Descrição da ocorrência",
      "foto": "data:image/jpeg;base64,..."
    }
  ]
}
```

O retorno de sucesso é `201` com `id_relatorio`. Consulte as regras e limites em
[Visão geral](VISAO_GERAL.md#regras-importantes-da-inspecao).

## Cadastros

| Recurso | Rotas | Acesso |
| --- | --- | --- |
| Modelos | `POST /cadastros/modelos`, `GET /cadastros/modelos`, `GET /cadastros/modelos/:id`, `PUT /cadastros/modelos/:id` | `ADMIN` |
| Marcas | `GET /cadastros/marcas`, `GET /cadastros/marcas/:id/logo` | Autenticado |
| Marcas | `POST`, `PUT`, `DELETE /cadastros/marcas[/:id]` | `ADMIN` |
| Setores | `GET`, `POST`, `PUT`, `DELETE /cadastros/setores[/:id]` | Leitura autenticada; escrita `ADMIN` |
| Células | `GET`, `POST`, `PUT`, `DELETE /cadastros/celulas[/:id]` | Leitura autenticada; escrita `ADMIN` |
| Unidades | `GET`, `POST`, `PUT`, `DELETE /cadastros/unidades[/:id]` | Leitura autenticada; escrita `ADMIN` |
| Turnos | `GET`, `POST`, `PUT`, `DELETE /cadastros/turnos[/:id]` | Leitura autenticada; escrita `ADMIN` |
| Categorias padrão | `GET`, `POST`, `PUT`, `DELETE /cadastros/categorias-padrao[/:id]` | Leitura autenticada; escrita `ADMIN` |

O detalhe de um modelo inclui `versao`. O `PUT /cadastros/modelos/:id` deve
reenviar esse valor; uma atualização bem-sucedida incrementa e devolve a nova
versão. Se outro administrador tiver salvo antes, a API retorna `409` com o
código `MODELO_ALTERADO_CONCORRENTEMENTE`, e o cliente deve recarregar o modelo
antes de tentar novamente.

Nomes de cadastros são obrigatórios, limitados a 255 caracteres e normalizados
para maiúsculas. Logotipos de marca aceitam JPEG, PNG ou WebP em Base64, até
512 KB.
