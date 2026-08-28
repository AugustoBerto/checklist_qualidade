# Visão geral e regras de negócio

## Objetivo

O Checklist App apoia auditorias de qualidade na produção. Administradores
mantêm os cadastros e os modelos; usuários liberados escolhem o contexto da
inspeção, respondem o formulário e consultam as submissões e seus indicadores.

## Fluxo principal

1. O usuário entra com a credencial corporativa pelo `dass_auth`.
2. O Checklist associa a matrícula do token a um perfil local ativo.
3. O usuário seleciona setor, marca, célula e um modelo compatível.
4. A aplicação carrega as perguntas ativas agrupadas por categoria.
5. O usuário responde cada item, registra evidência quando necessária e assina.
6. A API valida todo o conjunto e persiste a submissão e um snapshot do modelo.
7. A aplicação exibe o resumo de conformidade e permite consultar o histórico.

O snapshot preserva nome do modelo, perguntas, categorias e marca usados no
momento da inspeção. Alterações posteriores no cadastro não mudam o conteúdo
histórico do relatório.

## Papéis

| Papel | Acesso |
| --- | --- |
| `ADMIN` | Todos os fluxos e a área de configurações, modelos e perfis. |
| `LIDER` | Execução e consulta de checklists. |
| `INSPETOR` | Execução e consulta de checklists. |

O backend é a autoridade sobre permissões. Um `ADMIN` também satisfaz rotas
autenticadas sem papel específico. A interface esconde a configuração dos
demais papéis, mas essa restrição também é aplicada pela API.

## Regras importantes da inspeção

- Somente modelos ativos com perguntas ativas podem ser executados.
- Modelo, setor e célula devem existir, estar ativos e ser compatíveis.
- Cada pergunta ativa deve aparecer exatamente uma vez na submissão.
- Respostas aceitas: `Conforme`, `Não Conforme` e `N/A`.
- `Não Conforme` exige observação e foto.
- Fotos aceitam JPEG, PNG ou WebP em data URL Base64, até 2 MB cada.
- A assinatura aceita os mesmos formatos de imagem e tem limite de 1 MB.
- O corpo inteiro da requisição é limitado a 12 MB.

## Cadastros

A configuração administrativa reúne:

- marcas, inclusive logotipo opcional;
- setores, unidades, células de produção e turnos;
- categorias padrão reutilizáveis;
- modelos, categorias e perguntas;
- perfis locais ligados a uma matrícula corporativa.

Setores, unidades, células e categorias padrão são desativados logicamente nas
operações de exclusão. Marcas e turnos são removidos fisicamente quando não há
uma restrição de integridade impedindo a operação.

## Relatórios

A consulta de submissões oferece paginação e filtros por período, texto,
usuário, marca, modelo, setor e célula. Há duas apresentações:

- resumo gráfico da distribuição de respostas;
- detalhe da auditoria, com respostas, observações, fotos e assinatura.

A pontuação detalhada considera respostas conformes e `N/A` como positivas em
relação ao total armazenado.

