WITH candidatas AS (
  SELECT modelo.id AS id_modelo, MIN(marcas.id) AS id_marca
  FROM checklist_app.modelo AS modelo
  JOIN checklist_app.marcas AS marcas
    ON marcas.id::text = BTRIM(modelo.marca)
    OR UPPER(BTRIM(marcas.nome)) = UPPER(BTRIM(modelo.marca))
  WHERE modelo.id_marca_fk IS NULL
    AND NULLIF(BTRIM(modelo.marca), '') IS NOT NULL
  GROUP BY modelo.id
  HAVING COUNT(DISTINCT marcas.id) = 1
)
UPDATE checklist_app.modelo AS modelo
SET id_marca_fk = candidatas.id_marca
FROM candidatas
WHERE modelo.id = candidatas.id_modelo
  AND modelo.id_marca_fk IS NULL;
