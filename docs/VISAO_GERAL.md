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
6. A API valida todo o conjunto e persiste a submissão, o snapshot documental e
   as evidências em registros separados.
7. A aplicação exibe o resumo de conformidade e permite consultar o histórico.

O snapshot preserva modelo, marca, setor, célula, auditor, perguntas, categorias
e a quantidade original de evidências existentes no momento da inspeção.
Alterações posteriores nos cadastros não mudam o documento histórico.

## Papéis

| Papel | Acesso |
| --- | --- |
| `PENDENTE` | Identidade sincronizada, sem acesso até liberação administrativa. |
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
- perfis locais sincronizados no primeiro login e ligados a uma matrícula corporativa.

Setores, unidades, células e categorias padrão são desativados logicamente nas
operações de exclusão. Marcas e turnos são removidos fisicamente quando não há
uma restrição de integridade impedindo a operação.

## Relatórios

A consulta de submissões oferece paginação e filtros por período, texto,
usuário, marca, modelo, setor e célula. Há duas apresentações:

- resumo gráfico da distribuição de respostas;
- detalhe formal da auditoria, com respostas, observações e assinatura;
- galeria separada para as evidências fotográficas ainda disponíveis.

O documento é permanente. Evidências novas expiram em seis meses e deixam de ser
servidas pela API, mas a quantidade originalmente registrada continua visível no
documento. Consulte [Documentos de checklist e evidências](DOCUMENTOS_E_EVIDENCIAS.md).

A pontuação detalhada considera respostas conformes e `N/A` como positivas em
relação ao total armazenado.
