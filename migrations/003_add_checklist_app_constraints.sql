BEGIN;

SET LOCAL search_path TO checklist_app, pg_catalog;

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "checklist_app"."categorias_id_seq"
OWNED BY "checklist_app"."categorias"."id";

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "checklist_app"."celulas_producao_id_seq"
OWNED BY "checklist_app"."celulas_producao"."id";

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "checklist_app"."checklist_submissoes_id_seq"
OWNED BY "checklist_app"."formulario_submissoes"."id";

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "checklist_app"."dashboard_widgets_id_seq"
OWNED BY "checklist_app"."dashboard_widgets"."id";

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "checklist_app"."dashboards_id_seq"
OWNED BY "checklist_app"."dashboards"."id";

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "checklist_app"."marcas_id_seq"
OWNED BY "checklist_app"."marcas"."id";

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "checklist_app"."modelo_id_seq"
OWNED BY "checklist_app"."modelo"."id";

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "checklist_app"."perguntas_id_seq"
OWNED BY "checklist_app"."perguntas"."id";

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "checklist_app"."setores_id_seq"
OWNED BY "checklist_app"."setores"."id";

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "checklist_app"."turnos_id_seq"
OWNED BY "checklist_app"."turnos"."id";

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "checklist_app"."unidades_id_seq"
OWNED BY "checklist_app"."unidades"."id";

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "checklist_app"."usuarios_id_seq"
OWNED BY "checklist_app"."usuarios"."id";

-- ----------------------------
-- Uniques structure for table admin
-- ----------------------------
ALTER TABLE "checklist_app"."admin" ADD CONSTRAINT "usuarios_copy1_email_key" UNIQUE ("email");

-- ----------------------------
-- Primary Key structure for table admin
-- ----------------------------
ALTER TABLE "checklist_app"."admin" ADD CONSTRAINT "usuarios_copy1_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table categorias
-- ----------------------------
ALTER TABLE "checklist_app"."categorias" ADD CONSTRAINT "categorias_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table celulas_producao
-- ----------------------------
ALTER TABLE "checklist_app"."celulas_producao" ADD CONSTRAINT "celulas_producao_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table dashboard_widgets
-- ----------------------------
ALTER TABLE "checklist_app"."dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table dashboards
-- ----------------------------
ALTER TABLE "checklist_app"."dashboards" ADD CONSTRAINT "dashboards_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table formulario_submissoes
-- ----------------------------
ALTER TABLE "checklist_app"."formulario_submissoes" ADD CONSTRAINT "formulario_submissoes_v2_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table marcas
-- ----------------------------
ALTER TABLE "checklist_app"."marcas" ADD CONSTRAINT "marcas_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table modelo
-- ----------------------------
ALTER TABLE "checklist_app"."modelo" ADD CONSTRAINT "modelo_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table perguntas
-- ----------------------------
ALTER TABLE "checklist_app"."perguntas" ADD CONSTRAINT "perguntas_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table setores
-- ----------------------------
ALTER TABLE "checklist_app"."setores" ADD CONSTRAINT "setores_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table turnos
-- ----------------------------
ALTER TABLE "checklist_app"."turnos" ADD CONSTRAINT "turnos_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table unidades
-- ----------------------------
ALTER TABLE "checklist_app"."unidades" ADD CONSTRAINT "unidades_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table usuarios
-- ----------------------------
ALTER TABLE "checklist_app"."usuarios" ADD CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Foreign Keys structure for table categorias
-- ----------------------------
ALTER TABLE "checklist_app"."categorias" ADD CONSTRAINT "categorias_id_modelo_fkey" FOREIGN KEY ("id_modelo") REFERENCES "checklist_app"."modelo" ("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table celulas_producao
-- ----------------------------
ALTER TABLE "checklist_app"."celulas_producao" ADD CONSTRAINT "celulas_producao_id_marca_fk_fkey" FOREIGN KEY ("id_marca_fk") REFERENCES "checklist_app"."marcas" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "checklist_app"."celulas_producao" ADD CONSTRAINT "celulas_producao_id_setor_fk_fkey" FOREIGN KEY ("id_setor_fk") REFERENCES "checklist_app"."setores" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table dashboard_widgets
-- ----------------------------
ALTER TABLE "checklist_app"."dashboard_widgets" ADD CONSTRAINT "fk_widget_dashboard" FOREIGN KEY ("id_dashboard") REFERENCES "checklist_app"."dashboards" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table formulario_submissoes
-- ----------------------------
ALTER TABLE "checklist_app"."formulario_submissoes" ADD CONSTRAINT "formulario_submissoes_v2_id_celula_fkey" FOREIGN KEY ("id_celula") REFERENCES "checklist_app"."celulas_producao" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "checklist_app"."formulario_submissoes" ADD CONSTRAINT "formulario_submissoes_v2_id_modelo_fkey" FOREIGN KEY ("id_modelo") REFERENCES "checklist_app"."modelo" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "checklist_app"."formulario_submissoes" ADD CONSTRAINT "formulario_submissoes_v2_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "checklist_app"."usuarios" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table modelo
-- ----------------------------
ALTER TABLE "checklist_app"."modelo" ADD CONSTRAINT "fk_modelo_setor" FOREIGN KEY ("id_setor_fk") REFERENCES "checklist_app"."setores" ("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table perguntas
-- ----------------------------
ALTER TABLE "checklist_app"."perguntas" ADD CONSTRAINT "fk_perguntas_id_categoria" FOREIGN KEY ("id_categoria") REFERENCES "checklist_app"."categorias" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "checklist_app"."perguntas" ADD CONSTRAINT "fk_perguntas_id_modelo" FOREIGN KEY ("id_modelo") REFERENCES "checklist_app"."modelo" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table usuarios
-- ----------------------------
ALTER TABLE "checklist_app"."usuarios" ADD CONSTRAINT "usuarios_id_celula_fk_fkey" FOREIGN KEY ("id_celula_fk") REFERENCES "checklist_app"."celulas_producao" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "checklist_app"."usuarios" ADD CONSTRAINT "usuarios_id_setor_fk_fkey" FOREIGN KEY ("id_setor_fk") REFERENCES "checklist_app"."setores" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "checklist_app"."usuarios" ADD CONSTRAINT "usuarios_id_turno_fk_fkey" FOREIGN KEY ("id_turno_fk") REFERENCES "checklist_app"."turnos" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "checklist_app"."usuarios" ADD CONSTRAINT "usuarios_id_unidade_fk_fkey" FOREIGN KEY ("id_unidade_fk") REFERENCES "checklist_app"."unidades" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT;
