BEGIN;

CREATE SCHEMA checklist_app;
SET LOCAL search_path TO checklist_app, pg_catalog;

CREATE SEQUENCE "checklist_app"."categorias_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for celulas_producao_id_seq
-- ----------------------------
CREATE SEQUENCE "checklist_app"."celulas_producao_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for checklist_submissoes_id_seq
-- ----------------------------
CREATE SEQUENCE "checklist_app"."checklist_submissoes_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for dashboard_widgets_id_seq
-- ----------------------------
CREATE SEQUENCE "checklist_app"."dashboard_widgets_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for dashboards_id_seq
-- ----------------------------
CREATE SEQUENCE "checklist_app"."dashboards_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for marcas_id_seq
-- ----------------------------
CREATE SEQUENCE "checklist_app"."marcas_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for modelo_id_seq
-- ----------------------------
CREATE SEQUENCE "checklist_app"."modelo_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for perguntas_id_seq
-- ----------------------------
CREATE SEQUENCE "checklist_app"."perguntas_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for setores_id_seq
-- ----------------------------
CREATE SEQUENCE "checklist_app"."setores_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for turnos_id_seq
-- ----------------------------
CREATE SEQUENCE "checklist_app"."turnos_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for unidades_id_seq
-- ----------------------------
CREATE SEQUENCE "checklist_app"."unidades_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for usuarios_id_seq
-- ----------------------------
CREATE SEQUENCE "checklist_app"."usuarios_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Table structure for admin
-- ----------------------------
CREATE TABLE "checklist_app"."admin" (
  "id" int4 NOT NULL DEFAULT nextval('usuarios_id_seq'::regclass),
  "nome" varchar COLLATE "pg_catalog"."default",
  "email" varchar COLLATE "pg_catalog"."default",
  "senha" varchar COLLATE "pg_catalog"."default",
  "codBar" varchar(255) COLLATE "pg_catalog"."default",
  "nivelusuario" int2 DEFAULT 0
)
;

-- ----------------------------
-- Table structure for categorias
-- ----------------------------
CREATE TABLE "checklist_app"."categorias" (
  "id" int4 NOT NULL DEFAULT nextval('categorias_id_seq'::regclass),
  "id_modelo" int4,
  "categoria" varchar(255) COLLATE "pg_catalog"."default",
  "ctq" bool DEFAULT false
)
;

-- ----------------------------
-- Table structure for celulas_producao
-- ----------------------------
CREATE TABLE "checklist_app"."celulas_producao" (
  "id" int4 NOT NULL DEFAULT nextval('celulas_producao_id_seq'::regclass),
  "nome" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "id_setor_fk" int4,
  "ativo" int4 DEFAULT 1,
  "id_marca_fk" int4
)
;

-- ----------------------------
-- Table structure for dashboard_widgets
-- ----------------------------
CREATE TABLE "checklist_app"."dashboard_widgets" (
  "id" int4 NOT NULL DEFAULT nextval('dashboard_widgets_id_seq'::regclass),
  "id_dashboard" int4 NOT NULL,
  "titulo" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "tipo_grafico" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "tamanho_coluna" int2 DEFAULT 1,
  "fonte_dados" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "configuracao" jsonb NOT NULL,
  "ordem" int2 DEFAULT 0
)
;

-- ----------------------------
-- Table structure for dashboards
-- ----------------------------
CREATE TABLE "checklist_app"."dashboards" (
  "id" int4 NOT NULL DEFAULT nextval('dashboards_id_seq'::regclass),
  "titulo" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "descricao" text COLLATE "pg_catalog"."default",
  "icone" varchar(50) COLLATE "pg_catalog"."default",
  "ativo" bool DEFAULT true,
  "data_criacao" timestamp(6) NOT NULL DEFAULT now(),
  "filtros_globais" jsonb DEFAULT '[]'::jsonb
)
;

-- ----------------------------
-- Table structure for formulario_submissoes
-- ----------------------------
CREATE TABLE "checklist_app"."formulario_submissoes" (
  "id" int4 NOT NULL DEFAULT nextval('checklist_submissoes_id_seq'::regclass),
  "id_usuario" int4,
  "id_modelo" int4,
  "id_celula" int4,
  "assinatura" bytea,
  "respostas" jsonb NOT NULL,
  "inicio_checklist" timestamp(6),
  "data_envio" timestamp(6) DEFAULT now(),
  "id_setor" int4,
  "assinatura_path" text COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Table structure for marcas
-- ----------------------------
CREATE TABLE "checklist_app"."marcas" (
  "id" int4 NOT NULL DEFAULT nextval('marcas_id_seq'::regclass),
  "nome" varchar(255) COLLATE "pg_catalog"."default",
  "ultimaAlteracao" timestamp(6) DEFAULT now()
)
;

-- ----------------------------
-- Table structure for modelo
-- ----------------------------
CREATE TABLE "checklist_app"."modelo" (
  "id" int4 NOT NULL DEFAULT nextval('modelo_id_seq'::regclass),
  "nome" varchar(255) COLLATE "pg_catalog"."default",
  "data_criacao" timestamp(6) NOT NULL DEFAULT now(),
  "marca" varchar(255) COLLATE "pg_catalog"."default",
  "ativo" bool DEFAULT true,
  "id_setor_fk" int4
)
;

-- ----------------------------
-- Table structure for perguntas
-- ----------------------------
CREATE TABLE "checklist_app"."perguntas" (
  "id" int4 NOT NULL DEFAULT nextval('perguntas_id_seq'::regclass),
  "id_categoria" int4,
  "id_modelo" int4,
  "pergunta" text COLLATE "pg_catalog"."default",
  "identificacao" varchar(100) COLLATE "pg_catalog"."default",
  "ativo" int2 DEFAULT 1
)
;

-- ----------------------------
-- Table structure for setores
-- ----------------------------
CREATE TABLE "checklist_app"."setores" (
  "id" int4 NOT NULL DEFAULT nextval('setores_id_seq'::regclass),
  "nome" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "ativo" int4 DEFAULT 1
)
;

-- ----------------------------
-- Table structure for turnos
-- ----------------------------
CREATE TABLE "checklist_app"."turnos" (
  "id" int4 NOT NULL DEFAULT nextval('turnos_id_seq'::regclass),
  "nome" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "entrada_inicio" time(6) NOT NULL,
  "entrada_fim" time(6) NOT NULL,
  "intervalo_inicio" time(6) NOT NULL,
  "intervalo_fim" time(6) NOT NULL
)
;

-- ----------------------------
-- Table structure for unidades
-- ----------------------------
CREATE TABLE "checklist_app"."unidades" (
  "id" int4 NOT NULL DEFAULT nextval('unidades_id_seq'::regclass),
  "nome" varchar(100) COLLATE "pg_catalog"."default" NOT NULL
)
;

-- ----------------------------
-- Table structure for usuarios
-- ----------------------------
CREATE TABLE "checklist_app"."usuarios" (
  "id" int4 NOT NULL DEFAULT nextval('usuarios_id_seq'::regclass),
  "nome" varchar COLLATE "pg_catalog"."default",
  "email" varchar COLLATE "pg_catalog"."default",
  "senha" varchar COLLATE "pg_catalog"."default",
  "codBar" varchar(255) COLLATE "pg_catalog"."default",
  "ativo" int2,
  "funcao" varchar(255) COLLATE "pg_catalog"."default",
  "nivelusuario" int2,
  "id_setor_fk" int4,
  "id_celula_fk" int4,
  "id_unidade_fk" int4,
  "id_turno_fk" int4
)
;

-- ----------------------------
-- View structure for metricas_atualizadas_tableau_copy3
-- ----------------------------

COMMIT;
