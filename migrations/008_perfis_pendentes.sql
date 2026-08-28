ALTER TABLE checklist_app.usuarios
  DROP CONSTRAINT usuarios_papel_check;

ALTER TABLE checklist_app.usuarios
  ADD CONSTRAINT usuarios_papel_check
  CHECK (papel IN ('PENDENTE', 'ADMIN', 'LIDER', 'INSPETOR'));

