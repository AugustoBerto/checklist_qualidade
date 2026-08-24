BEGIN;

SET LOCAL search_path TO checklist_app, pg_catalog;

ALTER TABLE modelo
  ADD COLUMN IF NOT EXISTS id_marca_fk integer;

-- Accept the two legacy representations found in modelo.marca: the textual
-- brand id and the brand name. Only an unambiguous match is migrated.
WITH matches AS (
  SELECT m.id AS modelo_id, min(ma.id) AS marca_id
  FROM modelo m
  JOIN marcas ma
    ON trim(m.marca) = ma.id::text
    OR upper(trim(m.marca)) = upper(trim(ma.nome))
  WHERE m.id_marca_fk IS NULL AND m.marca IS NOT NULL
  GROUP BY m.id
  HAVING count(DISTINCT ma.id) = 1
)
UPDATE modelo m
SET id_marca_fk = matches.marca_id
FROM matches
WHERE m.id = matches.modelo_id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'modelo_id_marca_fk_fkey'
      AND conrelid = 'checklist_app.modelo'::regclass
  ) THEN
    ALTER TABLE modelo
      ADD CONSTRAINT modelo_id_marca_fk_fkey
      FOREIGN KEY (id_marca_fk) REFERENCES marcas(id) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'formulario_submissoes_id_setor_fkey'
      AND conrelid = 'checklist_app.formulario_submissoes'::regclass
  ) THEN
    ALTER TABLE formulario_submissoes
      ADD CONSTRAINT formulario_submissoes_id_setor_fkey
      FOREIGN KEY (id_setor) REFERENCES setores(id) NOT VALID;
  END IF;
END
$$;

ALTER TABLE modelo VALIDATE CONSTRAINT modelo_id_marca_fk_fkey;

-- Preserve a usable NOT VALID constraint when an older installation contains
-- orphan sectors. The preflight query in README.md identifies those rows.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM formulario_submissoes fs
    LEFT JOIN setores s ON s.id = fs.id_setor
    WHERE fs.id_setor IS NOT NULL AND s.id IS NULL
  ) THEN
    ALTER TABLE formulario_submissoes
      VALIDATE CONSTRAINT formulario_submissoes_id_setor_fkey;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS modelo_id_marca_fk_idx ON modelo (id_marca_fk);
CREATE INDEX IF NOT EXISTS formulario_submissoes_id_setor_idx
  ON formulario_submissoes (id_setor);

COMMIT;
