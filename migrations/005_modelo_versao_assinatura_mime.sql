ALTER TABLE checklist_app.modelo
  ADD COLUMN versao integer NOT NULL DEFAULT 1,
  ADD CONSTRAINT modelo_versao_positive CHECK (versao > 0);

ALTER TABLE checklist_app.formulario_submissoes
  ADD COLUMN assinatura_mime varchar(16),
  ADD CONSTRAINT formulario_assinatura_mime_check
    CHECK (
      assinatura_mime IS NULL
      OR assinatura_mime IN ('image/jpeg', 'image/png', 'image/webp')
    );
