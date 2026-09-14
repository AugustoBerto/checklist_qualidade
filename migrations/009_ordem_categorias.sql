ALTER TABLE checklist_app.categorias
  ADD COLUMN ordem integer;

WITH categorias_ordenadas AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY id_modelo ORDER BY id) AS ordem
  FROM checklist_app.categorias
)
UPDATE checklist_app.categorias AS categoria
SET ordem = categorias_ordenadas.ordem
FROM categorias_ordenadas
WHERE categoria.id = categorias_ordenadas.id;

ALTER TABLE checklist_app.categorias
  ALTER COLUMN ordem SET DEFAULT 1,
  ALTER COLUMN ordem SET NOT NULL,
  ADD CONSTRAINT categorias_ordem_positive CHECK (ordem > 0);

CREATE INDEX categorias_modelo_ordem_idx
  ON checklist_app.categorias (id_modelo, ordem, id);
