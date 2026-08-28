# Documentos de checklist e evidências

## Separação de responsabilidades

Uma checklist concluída produz dois registros com ciclos de vida diferentes:

- o **documento da checklist** é permanente e contém identificação, contexto,
  perguntas, respostas, observações, resultado, datas e assinatura;
- as **evidências fotográficas** são anexos temporários, consultados e impressos
  separadamente do documento.

As fotos nunca fazem parte da representação impressa do documento. O documento
registra a quantidade originalmente anexada, mesmo depois de os arquivos
deixarem de estar disponíveis.

## Snapshot documental

Novas submissões gravam um snapshot de schema `2` junto da submissão. Ele
preserva os valores existentes no encerramento:

- modelo, marca e versão;
- setor, célula e unidade do auditor;
- nome, matrícula, função e papel do auditor;
- perguntas, categorias e indicação CTQ;
- início da execução;
- quantidade original de evidências.

Respostas, observações, horário de conclusão e assinatura também são dados da
própria submissão e não dependem dos cadastros atuais. Os endpoints usam os
cadastros vivos apenas como fallback para registros anteriores ao snapshot `2`.

## Retenção das evidências

Cada nova foto é armazenada em `formulario_evidencias`, vinculada à submissão e
à pergunta. O prazo padrão é de seis meses a partir da conclusão.

- antes de `expira_em`, o arquivo pode ser visualizado, baixado ou impresso pela
  galeria;
- depois de `expira_em`, a API não entrega o conteúdo e responde `410` com o
  código `EVIDENCIA_EXPIRADA`;
- `removida_em` registra uma remoção antecipada ou a limpeza física posterior;
- a contagem histórica permanece no snapshot e não é recalculada pela quantidade
  de arquivos ainda disponíveis.

A expiração lógica é aplicada pela API independentemente da limpeza física. Para
remover os bytes expirados de forma idempotente e preservar os metadados, execute
periodicamente no backend:

```bash
npm run evidencias:cleanup
```

O agendador da implantação deve registrar a saída do comando para auditoria. A
rotina preenche `removida_em`, mas não altera `formulario_submissoes.respostas`
nem o snapshot.

Registros antigos que ainda contenham fotos Base64 dentro de `respostas` são
expostos pela API como evidências legadas. Eles permanecem compatíveis, mas não
recebem retroativamente uma data confiável de expiração.

## Consulta e impressão

A página de detalhe contém duas áreas independentes:

1. documento formal, adequado à consulta e com uma árvore exclusiva para A4;
2. galeria de evidências, com visualização, navegação, download e impressão dos
   anexos disponíveis.

Na impressão do documento, topbar, menus, botões, galeria e fotos são ocultados.
A assinatura permanece porque integra o registro permanente.
