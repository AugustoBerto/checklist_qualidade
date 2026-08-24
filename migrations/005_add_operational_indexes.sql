-- Operational indexes are kept in a versioned migration so installations
-- initialized before the DB foundation can adopt them through db:migrate.
ALTER TABLE checklist_app.unidades
  ADD COLUMN IF NOT EXISTS ativo integer NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS modelo_ativo_nome_idx
  ON checklist_app.modelo (ativo, nome);

CREATE INDEX IF NOT EXISTS celulas_ativo_nome_idx
  ON checklist_app.celulas_producao (ativo, nome);

CREATE INDEX IF NOT EXISTS formulario_submissoes_celula_data_idx
  ON checklist_app.formulario_submissoes (id_celula, data_envio DESC);
