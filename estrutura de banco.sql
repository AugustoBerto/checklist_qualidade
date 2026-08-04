/*
 Navicat Premium Dump SQL

 Source Server         : localhost_5432
 Source Server Type    : PostgreSQL
 Source Server Version : 170005 (170005)
 Source Host           : localhost:5432
 Source Catalog        : meubanco
 Source Schema         : public

 Target Server Type    : PostgreSQL
 Target Server Version : 170005 (170005)
 File Encoding         : 65001

 Date: 30/03/2026 14:06:17
*/


-- ----------------------------
-- Sequence structure for categorias_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."categorias_id_seq";
CREATE SEQUENCE "public"."categorias_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for checklist_submissoes_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."checklist_submissoes_id_seq";
CREATE SEQUENCE "public"."checklist_submissoes_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for dashboard_widgets_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."dashboard_widgets_id_seq";
CREATE SEQUENCE "public"."dashboard_widgets_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for dashboards_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."dashboards_id_seq";
CREATE SEQUENCE "public"."dashboards_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for formulario_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."formulario_id_seq";
CREATE SEQUENCE "public"."formulario_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for marcas_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."marcas_id_seq";
CREATE SEQUENCE "public"."marcas_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for modelo_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."modelo_id_seq";
CREATE SEQUENCE "public"."modelo_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for perguntas_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."perguntas_id_seq";
CREATE SEQUENCE "public"."perguntas_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for usuarios_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."usuarios_id_seq";
CREATE SEQUENCE "public"."usuarios_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Table structure for admin
-- ----------------------------
DROP TABLE IF EXISTS "public"."admin";
CREATE TABLE "public"."admin" (
  "id" int4 NOT NULL DEFAULT nextval('usuarios_id_seq'::regclass),
  "nome" varchar COLLATE "pg_catalog"."default",
  "email" varchar COLLATE "pg_catalog"."default",
  "senha" varchar COLLATE "pg_catalog"."default",
  "codBar" varchar(255) COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Table structure for categorias
-- ----------------------------
DROP TABLE IF EXISTS "public"."categorias";
CREATE TABLE "public"."categorias" (
  "id" int4 NOT NULL DEFAULT nextval('categorias_id_seq'::regclass),
  "id_modelo" int4,
  "categoria" varchar(255) COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Table structure for dashboard_widgets
-- ----------------------------
DROP TABLE IF EXISTS "public"."dashboard_widgets";
CREATE TABLE "public"."dashboard_widgets" (
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
DROP TABLE IF EXISTS "public"."dashboards";
CREATE TABLE "public"."dashboards" (
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
-- Table structure for formulario
-- ----------------------------
DROP TABLE IF EXISTS "public"."formulario";
CREATE TABLE "public"."formulario" (
  "id" int4 NOT NULL DEFAULT nextval('formulario_id_seq'::regclass),
  "nome_usuario" text COLLATE "pg_catalog"."default",
  "nome_modelo" text COLLATE "pg_catalog"."default",
  "nome_categoria" text COLLATE "pg_catalog"."default",
  "nome_pergunta" text COLLATE "pg_catalog"."default",
  "nome_identificacao" text COLLATE "pg_catalog"."default",
  "resposta" text COLLATE "pg_catalog"."default",
  "data_criacao" timestamp(6) NOT NULL DEFAULT now(),
  "id_formulario" int4,
  "assinatura" bytea,
  "foto" bytea,
  "id_usuario" int4,
  "id_modelo_fk" int4,
  "observacao" text COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Table structure for formulario_submissoes
-- ----------------------------
DROP TABLE IF EXISTS "public"."formulario_submissoes";
CREATE TABLE "public"."formulario_submissoes" (
  "id" int4 NOT NULL DEFAULT nextval('checklist_submissoes_id_seq'::regclass),
  "assinatura" bytea,
  "data_envio" timestamp(6) DEFAULT now(),
  "data_inicio" timestamp(6)
)
;

-- ----------------------------
-- Table structure for marcas
-- ----------------------------
DROP TABLE IF EXISTS "public"."marcas";
CREATE TABLE "public"."marcas" (
  "id" int4 NOT NULL DEFAULT nextval('marcas_id_seq'::regclass),
  "nome" varchar(255) COLLATE "pg_catalog"."default",
  "ultimaAlteracao" timestamp(6) DEFAULT now()
)
;

-- ----------------------------
-- Table structure for modelo
-- ----------------------------
DROP TABLE IF EXISTS "public"."modelo";
CREATE TABLE "public"."modelo" (
  "id" int4 NOT NULL DEFAULT nextval('modelo_id_seq'::regclass),
  "nome" varchar(255) COLLATE "pg_catalog"."default",
  "data_criacao" timestamp(6) NOT NULL DEFAULT now(),
  "marca" varchar(255) COLLATE "pg_catalog"."default",
  "ativo" bool DEFAULT true
)
;

-- ----------------------------
-- Table structure for perguntas
-- ----------------------------
DROP TABLE IF EXISTS "public"."perguntas";
CREATE TABLE "public"."perguntas" (
  "id" int4 NOT NULL DEFAULT nextval('perguntas_id_seq'::regclass),
  "id_categoria" int4,
  "id_modelo" int4,
  "pergunta" text COLLATE "pg_catalog"."default",
  "identificacao" varchar(100) COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Table structure for usuarios
-- ----------------------------
DROP TABLE IF EXISTS "public"."usuarios";
CREATE TABLE "public"."usuarios" (
  "id" int4 NOT NULL DEFAULT nextval('usuarios_id_seq'::regclass),
  "nome" varchar COLLATE "pg_catalog"."default",
  "email" varchar COLLATE "pg_catalog"."default",
  "senha" varchar COLLATE "pg_catalog"."default",
  "codBar" varchar(255) COLLATE "pg_catalog"."default",
  "turno" varchar(32) COLLATE "pg_catalog"."default",
  "setor" varchar(255) COLLATE "pg_catalog"."default",
  "ativo" int2,
  "funcao" varchar(255) COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- View structure for vw_indicadores_gerais_totais
-- ----------------------------
DROP VIEW IF EXISTS "public"."vw_indicadores_gerais_totais";
CREATE VIEW "public"."vw_indicadores_gerais_totais" AS  WITH respostas_padronizadas AS (
         SELECT formulario.id_formulario,
            formulario.nome_categoria,
                CASE
                    WHEN lower(TRIM(BOTH FROM formulario.resposta)) = ANY (ARRAY['conforme'::text, 'n/a'::text]) THEN 'conforme'::text
                    WHEN lower(TRIM(BOTH FROM formulario.resposta)) = ANY (ARRAY['não conforme'::text, 'nao conforme'::text, 'não preenchido'::text, 'nao preenchido'::text]) THEN 'nao_conforme'::text
                    ELSE 'outro'::text
                END AS classificacao
           FROM formulario
        ), status_categoria_por_checklist AS (
         SELECT respostas_padronizadas.id_formulario,
            respostas_padronizadas.nome_categoria,
            max(
                CASE
                    WHEN respostas_padronizadas.classificacao = 'nao_conforme'::text THEN 1
                    ELSE 0
                END) AS eh_nao_conforme
           FROM respostas_padronizadas
          WHERE respostas_padronizadas.nome_categoria IS NOT NULL
          GROUP BY respostas_padronizadas.id_formulario, respostas_padronizadas.nome_categoria
        ), kpis_consolidados AS (
         SELECT ( SELECT count(DISTINCT formulario.id_formulario) AS count
                   FROM formulario) AS total_checklists,
            ( SELECT count(*) AS count
                   FROM status_categoria_por_checklist) AS total_categorias,
            ( SELECT count(*) AS count
                   FROM status_categoria_por_checklist
                  WHERE status_categoria_por_checklist.eh_nao_conforme = 0) AS total_categorias_conforme,
            ( SELECT count(*) AS count
                   FROM status_categoria_por_checklist
                  WHERE status_categoria_por_checklist.eh_nao_conforme = 1) AS total_categorias_nao_conforme,
            ( SELECT count(*) AS count
                   FROM respostas_padronizadas) AS total_perguntas,
            ( SELECT count(*) AS count
                   FROM respostas_padronizadas
                  WHERE respostas_padronizadas.classificacao = 'conforme'::text) AS total_perguntas_conforme,
            ( SELECT count(*) AS count
                   FROM respostas_padronizadas
                  WHERE respostas_padronizadas.classificacao = 'nao_conforme'::text) AS total_perguntas_nao_conforme
        )
 SELECT total_checklists,
    total_categorias,
    total_categorias_conforme,
    total_categorias_nao_conforme,
    total_perguntas,
    total_perguntas_conforme,
    total_perguntas_nao_conforme
   FROM kpis_consolidados;

-- ----------------------------
-- View structure for metricas_modelo
-- ----------------------------
DROP VIEW IF EXISTS "public"."metricas_modelo";
CREATE VIEW "public"."metricas_modelo" AS  SELECT count(*) AS total_modelos,
    max(data_criacao) AS data_ultimo_inserido
   FROM modelo;

-- ----------------------------
-- View structure for metricas_categorias_por_modelo
-- ----------------------------
DROP VIEW IF EXISTS "public"."metricas_categorias_por_modelo";
CREATE VIEW "public"."metricas_categorias_por_modelo" AS  SELECT m.id AS id_modelo,
    m.nome AS nome_modelo,
    count(c.id) AS total_categorias
   FROM modelo m
     LEFT JOIN categorias c ON c.id_modelo = m.id
  GROUP BY m.id, m.nome
  ORDER BY (count(c.id)) DESC;

-- ----------------------------
-- View structure for metricas_modelo_completas
-- ----------------------------
DROP VIEW IF EXISTS "public"."metricas_modelo_completas";
CREATE VIEW "public"."metricas_modelo_completas" AS  SELECT m.id AS id_modelo,
    m.nome AS nome_modelo,
    count(DISTINCT c.id) AS total_categorias,
    count(DISTINCT p.id) AS total_perguntas
   FROM modelo m
     LEFT JOIN categorias c ON c.id_modelo = m.id
     LEFT JOIN perguntas p ON p.id_modelo = m.id
  GROUP BY m.id, m.nome
  ORDER BY (count(DISTINCT p.id)) DESC;

-- ----------------------------
-- View structure for metricas_formulario_detalhadas
-- ----------------------------
DROP VIEW IF EXISTS "public"."metricas_formulario_detalhadas";
CREATE VIEW "public"."metricas_formulario_detalhadas" AS  WITH respostas_classificadas AS (
         SELECT f.id_formulario,
            f.data_criacao,
            f.nome_modelo,
            f.nome_usuario,
            f.nome_categoria,
            f.nome_pergunta,
                CASE
                    WHEN lower(TRIM(BOTH FROM f.resposta)) = ANY (ARRAY['conforme'::text, 'n/a'::text]) THEN 'conforme'::text
                    WHEN lower(TRIM(BOTH FROM f.resposta)) = ANY (ARRAY['não conforme'::text, 'nao conforme'::text, 'não preenchido'::text, 'nao preenchido'::text]) THEN 'nao_conforme'::text
                    ELSE 'outro'::text
                END AS classificacao
           FROM formulario f
        ), perguntas_por_formulario AS (
         SELECT respostas_classificadas.id_formulario,
            respostas_classificadas.data_criacao,
            ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text) AS data_criacao_sp,
            ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone AS hora_relatorio,
                CASE
                    WHEN ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '05:00:00'::time without time zone AND ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '09:55:00'::time without time zone OR ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '15:00:00'::time without time zone AND ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '20:30:00'::time without time zone THEN 'Entrada'::text
                    WHEN ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '11:00:00'::time without time zone AND ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '15:00:00'::time without time zone OR ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '21:10:00'::time without time zone OR ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '01:47:00'::time without time zone THEN 'Após Intervalo'::text
                    ELSE NULL::text
                END AS intervalo,
            respostas_classificadas.nome_modelo,
            respostas_classificadas.nome_usuario,
            count(*) AS total_perguntas,
            count(*) FILTER (WHERE respostas_classificadas.classificacao = 'conforme'::text) AS total_perguntas_conforme,
            count(*) FILTER (WHERE respostas_classificadas.classificacao = 'nao_conforme'::text) AS total_perguntas_nao_conforme
           FROM respostas_classificadas
          GROUP BY respostas_classificadas.id_formulario, respostas_classificadas.data_criacao, respostas_classificadas.nome_modelo, respostas_classificadas.nome_usuario
        ), categorias_classificadas AS (
         SELECT respostas_classificadas.id_formulario,
            respostas_classificadas.nome_categoria,
            max(
                CASE
                    WHEN respostas_classificadas.classificacao = 'nao_conforme'::text THEN 1
                    ELSE 0
                END) AS eh_nao_conforme
           FROM respostas_classificadas
          GROUP BY respostas_classificadas.id_formulario, respostas_classificadas.nome_categoria
        ), categorias_por_formulario AS (
         SELECT categorias_classificadas.id_formulario,
            count(*) AS total_categorias,
            count(*) FILTER (WHERE categorias_classificadas.eh_nao_conforme = 0) AS total_categorias_conforme,
            count(*) FILTER (WHERE categorias_classificadas.eh_nao_conforme = 1) AS total_categorias_nao_conforme
           FROM categorias_classificadas
          GROUP BY categorias_classificadas.id_formulario
        )
 SELECT p.id_formulario,
    p.data_criacao AS data_criacao_utc,
    p.data_criacao_sp,
    p.hora_relatorio,
    p.intervalo,
    p.nome_modelo,
    p.nome_usuario,
    p.total_perguntas,
    p.total_perguntas_conforme,
    p.total_perguntas_nao_conforme,
    COALESCE(c.total_categorias, 0::bigint) AS total_categorias,
    COALESCE(c.total_categorias_conforme, 0::bigint) AS total_categorias_conforme,
    COALESCE(c.total_categorias_nao_conforme, 0::bigint) AS total_categorias_nao_conforme
   FROM perguntas_por_formulario p
     LEFT JOIN categorias_por_formulario c ON p.id_formulario = c.id_formulario
  ORDER BY p.id_formulario DESC;

-- ----------------------------
-- View structure for top5_nao_conformes_por_modelo
-- ----------------------------
DROP VIEW IF EXISTS "public"."top5_nao_conformes_por_modelo";
CREATE VIEW "public"."top5_nao_conformes_por_modelo" AS  WITH contagem_nao_conformes AS (
         SELECT formulario.nome_modelo,
            formulario.nome_categoria,
            formulario.nome_pergunta,
            count(*) AS quantidade_nao_conforme
           FROM formulario
          WHERE lower(TRIM(BOTH FROM formulario.resposta)) = ANY (ARRAY['não conforme'::text, 'nao conforme'::text, 'não preenchido'::text, 'nao preenchido'::text])
          GROUP BY formulario.nome_modelo, formulario.nome_categoria, formulario.nome_pergunta
        ), ranking_nao_conformes AS (
         SELECT contagem_nao_conformes.nome_modelo,
            contagem_nao_conformes.nome_categoria,
            contagem_nao_conformes.nome_pergunta,
            contagem_nao_conformes.quantidade_nao_conforme,
            row_number() OVER (PARTITION BY contagem_nao_conformes.nome_modelo ORDER BY contagem_nao_conformes.quantidade_nao_conforme DESC) AS ranking
           FROM contagem_nao_conformes
        )
 SELECT nome_modelo,
    nome_categoria,
    nome_pergunta,
    quantidade_nao_conforme,
    ranking
   FROM ranking_nao_conformes
  WHERE ranking <= 5
  ORDER BY nome_modelo, ranking;

-- ----------------------------
-- View structure for metricas_atualizadas_2026_copy1
-- ----------------------------
DROP VIEW IF EXISTS "public"."metricas_atualizadas_2026_copy1";
CREATE VIEW "public"."metricas_atualizadas_2026_copy1" AS  WITH respostas_classificadas AS (
         SELECT f.id_formulario,
            f.data_criacao,
            f.id_modelo_fk,
            f.nome_modelo AS nome_modelo_original,
            f.id_usuario,
            f.nome_usuario AS nome_usuario_original,
            f.nome_categoria,
            f.nome_pergunta,
                CASE
                    WHEN lower(TRIM(BOTH FROM f.resposta)) = ANY (ARRAY['conforme'::text, 'n/a'::text]) THEN 'conforme'::text
                    WHEN lower(TRIM(BOTH FROM f.resposta)) = ANY (ARRAY['não conforme'::text, 'nao conforme'::text, 'não preenchido'::text, 'nao preenchido'::text]) THEN 'nao_conforme'::text
                    ELSE 'outro'::text
                END AS classificacao
           FROM formulario f
        ), perguntas_por_formulario AS (
         SELECT rc.id_formulario,
            ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text) AS data_e_horario,
            ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::date AS data_criacao,
            EXTRACT(year FROM ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text))::integer AS ano_criacao,
            ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone AS hora_relatorio,
            rc.id_modelo_fk,
            rc.nome_modelo_original,
            rc.id_usuario,
            rc.nome_usuario_original,
                CASE
                    WHEN ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '05:00:00'::time without time zone AND ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '09:55:00'::time without time zone OR ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '15:00:00'::time without time zone AND ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '20:30:00'::time without time zone THEN 'Entrada'::text
                    WHEN ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '11:00:00'::time without time zone AND ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '15:00:00'::time without time zone OR ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '21:10:00'::time without time zone OR ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '01:47:00'::time without time zone THEN 'Após Intervalo'::text
                    ELSE NULL::text
                END AS intervalo,
            count(*) AS total_perguntas,
            count(*) FILTER (WHERE rc.classificacao = 'conforme'::text) AS total_perguntas_conforme,
            count(*) FILTER (WHERE rc.classificacao = 'nao_conforme'::text) AS total_perguntas_nao_conforme
           FROM respostas_classificadas rc
          GROUP BY rc.id_formulario, rc.data_criacao, rc.id_modelo_fk, rc.nome_modelo_original, rc.id_usuario, rc.nome_usuario_original
        ), categorias_classificadas AS (
         SELECT rc.id_formulario,
            rc.nome_categoria,
            max(
                CASE
                    WHEN rc.classificacao = 'nao_conforme'::text THEN 1
                    ELSE 0
                END) AS eh_nao_conforme
           FROM respostas_classificadas rc
          GROUP BY rc.id_formulario, rc.nome_categoria
        ), categorias_por_formulario AS (
         SELECT cc.id_formulario,
            count(*) AS total_categorias,
            count(*) FILTER (WHERE cc.eh_nao_conforme = 0) AS total_categorias_conforme,
            count(*) FILTER (WHERE cc.eh_nao_conforme = 1) AS total_categorias_nao_conforme
           FROM categorias_classificadas cc
          GROUP BY cc.id_formulario
        ), checklists_reais AS (
         SELECT p.id_formulario,
            p.data_e_horario,
            p.data_criacao,
            p.ano_criacao,
            p.hora_relatorio,
            p.id_modelo_fk,
            p.nome_modelo_original,
            p.id_usuario,
            p.nome_usuario_original,
            p.intervalo,
            p.total_perguntas,
            p.total_perguntas_conforme,
            p.total_perguntas_nao_conforme,
            COALESCE(c.total_categorias, 0::bigint) AS total_categorias,
            COALESCE(c.total_categorias_conforme, 0::bigint) AS total_categorias_conforme,
            COALESCE(c.total_categorias_nao_conforme, 0::bigint) AS total_categorias_nao_conforme
           FROM perguntas_por_formulario p
             LEFT JOIN categorias_por_formulario c ON p.id_formulario = c.id_formulario
        ), dias_validos AS (
         SELECT DISTINCT checklists_reais.data_criacao,
            checklists_reais.ano_criacao
           FROM checklists_reais
          WHERE EXTRACT(isodow FROM checklists_reais.data_criacao) <= 5::numeric
        ), usuarios_com_atividade AS (
         SELECT cr.id_usuario,
            cr.nome_usuario_original,
            min(cr.data_criacao) AS data_primeiro_checklist,
            min(cr.data_e_horario) AS timestamp_criacao_usuario
           FROM checklists_reais cr
             JOIN usuarios u_1 ON cr.id_usuario IS NOT NULL AND cr.id_usuario = u_1.id OR cr.id_usuario IS NULL AND u_1.nome::text = cr.nome_usuario_original
          WHERE u_1.ativo = ANY (ARRAY[1, 2])
          GROUP BY cr.id_usuario, cr.nome_usuario_original
        ), checklists_esperados AS (
         SELECT d.data_criacao,
            d.ano_criacao,
            u_1.id_usuario,
            u_1.nome_usuario_original,
            i.intervalo
           FROM dias_validos d
             CROSS JOIN usuarios_com_atividade u_1
             CROSS JOIN ( SELECT unnest(ARRAY['Entrada'::text, 'Após Intervalo'::text]) AS intervalo) i
          WHERE d.data_criacao >= u_1.data_primeiro_checklist
        ), checklists_faltantes AS (
         SELECT '-9999'::integer AS id_formulario,
            e.data_criacao::timestamp without time zone AS data_e_horario,
            e.data_criacao,
            e.ano_criacao,
            '00:00:00'::time without time zone AS hora_relatorio,
            NULL::integer AS id_modelo_fk,
            'Não Realizado (Fictício)'::character varying AS nome_modelo_original,
            e.id_usuario,
            e.nome_usuario_original,
            e.intervalo,
            1::bigint AS total_perguntas,
            0::bigint AS total_perguntas_conforme,
            1::bigint AS total_perguntas_nao_conforme,
            1::bigint AS total_categorias,
            0::bigint AS total_categorias_conforme,
            1::bigint AS total_categorias_nao_conforme
           FROM checklists_esperados e
             LEFT JOIN checklists_reais r ON e.data_criacao = r.data_criacao AND (e.id_usuario = r.id_usuario OR e.id_usuario IS NULL AND r.id_usuario IS NULL AND e.nome_usuario_original = r.nome_usuario_original) AND e.intervalo = r.intervalo
          WHERE r.data_criacao IS NULL
        ), todos_checklists AS (
         SELECT checklists_reais.id_formulario,
            checklists_reais.data_e_horario,
            checklists_reais.data_criacao,
            checklists_reais.ano_criacao,
            checklists_reais.hora_relatorio,
            checklists_reais.id_modelo_fk,
            checklists_reais.nome_modelo_original,
            checklists_reais.id_usuario,
            checklists_reais.nome_usuario_original,
            checklists_reais.intervalo,
            checklists_reais.total_perguntas,
            checklists_reais.total_perguntas_conforme,
            checklists_reais.total_perguntas_nao_conforme,
            checklists_reais.total_categorias,
            checklists_reais.total_categorias_conforme,
            checklists_reais.total_categorias_nao_conforme,
            false AS eh_ficticio
           FROM checklists_reais
        UNION ALL
         SELECT checklists_faltantes.id_formulario,
            checklists_faltantes.data_e_horario,
            checklists_faltantes.data_criacao,
            checklists_faltantes.ano_criacao,
            checklists_faltantes.hora_relatorio,
            checklists_faltantes.id_modelo_fk,
            checklists_faltantes.nome_modelo_original,
            checklists_faltantes.id_usuario,
            checklists_faltantes.nome_usuario_original,
            checklists_faltantes.intervalo,
            checklists_faltantes.total_perguntas,
            checklists_faltantes.total_perguntas_conforme,
            checklists_faltantes.total_perguntas_nao_conforme,
            checklists_faltantes.total_categorias,
            checklists_faltantes.total_categorias_conforme,
            checklists_faltantes.total_categorias_nao_conforme,
            true AS eh_ficticio
           FROM checklists_faltantes
        )
 SELECT t.id_formulario,
    t.data_e_horario,
    t.data_criacao,
    t.ano_criacao,
    t.hora_relatorio,
    t.intervalo,
    COALESCE(mod.nome, t.nome_modelo_original::character varying) AS nome_modelo,
        CASE
            WHEN marc.nome IS NULL OR TRIM(BOTH FROM marc.nome::text) = ''::text THEN 'NÃO REALIZADOS'::character varying
            ELSE marc.nome
        END AS nome_marca,
    COALESCE(u.nome, t.nome_usuario_original::character varying) AS nome_usuario,
    uca.timestamp_criacao_usuario,
    u.turno,
    u.setor,
    u.ativo,
    t.total_perguntas,
    t.total_perguntas_conforme,
    t.total_perguntas_nao_conforme,
    t.total_categorias,
    t.total_categorias_conforme,
    t.total_categorias_nao_conforme,
    t.eh_ficticio
   FROM todos_checklists t
     LEFT JOIN modelo mod ON t.id_modelo_fk IS NOT NULL AND t.id_modelo_fk = mod.id OR t.id_modelo_fk IS NULL AND mod.nome::text = t.nome_modelo_original
     LEFT JOIN marcas marc ON
        CASE
            WHEN mod.marca::text ~ '^[0-9]+$'::text THEN mod.marca::integer
            ELSE NULL::integer
        END = marc.id
     LEFT JOIN usuarios u ON t.id_usuario IS NOT NULL AND t.id_usuario = u.id OR t.id_usuario IS NULL AND u.nome::text = t.nome_usuario_original
     LEFT JOIN usuarios_com_atividade uca ON t.id_usuario IS NOT NULL AND t.id_usuario = uca.id_usuario OR t.id_usuario IS NULL AND uca.nome_usuario_original = t.nome_usuario_original
  ORDER BY t.data_criacao DESC, t.nome_usuario_original, t.intervalo;

-- ----------------------------
-- View structure for vw_checklists_consolidados
-- ----------------------------
DROP VIEW IF EXISTS "public"."vw_checklists_consolidados";
CREATE VIEW "public"."vw_checklists_consolidados" AS  WITH vw_checklists_individuais AS (
         WITH respostas_classificadas AS (
                 SELECT f.id_formulario,
                    f.data_criacao,
                    f.nome_modelo,
                    f.nome_usuario,
                    f.nome_categoria,
                    f.nome_pergunta,
                        CASE
                            WHEN lower(TRIM(BOTH FROM f.resposta)) = ANY (ARRAY['conforme'::text, 'n/a'::text]) THEN 'conforme'::text
                            WHEN lower(TRIM(BOTH FROM f.resposta)) = ANY (ARRAY['não conforme'::text, 'nao conforme'::text, 'não preenchido'::text, 'nao preenchido'::text]) THEN 'nao_conforme'::text
                            ELSE 'outro'::text
                        END AS classificacao
                   FROM formulario f
                ), perguntas_por_formulario AS (
                 SELECT respostas_classificadas.id_formulario,
                    respostas_classificadas.data_criacao,
                    ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text) AS data_criacao_sp,
                    ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone AS hora_relatorio,
                        CASE
                            WHEN ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '05:00:00'::time without time zone AND ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '09:55:00'::time without time zone OR ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '15:00:00'::time without time zone AND ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '20:30:00'::time without time zone THEN 'Entrada'::text
                            WHEN ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '11:00:00'::time without time zone AND ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '15:00:00'::time without time zone OR ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '21:10:00'::time without time zone OR ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '01:47:00'::time without time zone THEN 'Após Intervalo'::text
                            ELSE NULL::text
                        END AS intervalo,
                    respostas_classificadas.nome_modelo,
                    respostas_classificadas.nome_usuario,
                    count(*) AS total_perguntas,
                    count(*) FILTER (WHERE respostas_classificadas.classificacao = 'conforme'::text) AS total_perguntas_conforme,
                    count(*) FILTER (WHERE respostas_classificadas.classificacao = 'nao_conforme'::text) AS total_perguntas_nao_conforme
                   FROM respostas_classificadas
                  GROUP BY respostas_classificadas.id_formulario, respostas_classificadas.data_criacao, respostas_classificadas.nome_modelo, respostas_classificadas.nome_usuario
                ), categorias_classificadas AS (
                 SELECT respostas_classificadas.id_formulario,
                    respostas_classificadas.nome_categoria,
                    max(
                        CASE
                            WHEN respostas_classificadas.classificacao = 'nao_conforme'::text THEN 1
                            ELSE 0
                        END) AS eh_nao_conforme
                   FROM respostas_classificadas
                  GROUP BY respostas_classificadas.id_formulario, respostas_classificadas.nome_categoria
                ), categorias_por_formulario AS (
                 SELECT categorias_classificadas.id_formulario,
                    count(*) AS total_categorias,
                    count(*) FILTER (WHERE categorias_classificadas.eh_nao_conforme = 0) AS total_categorias_conforme,
                    count(*) FILTER (WHERE categorias_classificadas.eh_nao_conforme = 1) AS total_categorias_nao_conforme
                   FROM categorias_classificadas
                  GROUP BY categorias_classificadas.id_formulario
                )
         SELECT p.id_formulario,
            p.data_criacao AS data_criacao_utc,
            p.data_criacao_sp,
            p.hora_relatorio,
            p.intervalo,
            p.nome_modelo,
            p.nome_usuario,
            p.total_perguntas,
            p.total_perguntas_conforme,
            p.total_perguntas_nao_conforme,
            COALESCE(c.total_categorias, 0::bigint) AS total_categorias,
            COALESCE(c.total_categorias_conforme, 0::bigint) AS total_categorias_conforme,
            COALESCE(c.total_categorias_nao_conforme, 0::bigint) AS total_categorias_nao_conforme
           FROM perguntas_por_formulario p
             LEFT JOIN categorias_por_formulario c ON p.id_formulario = c.id_formulario
        )
 SELECT nome_modelo,
    nome_usuario,
    count(*) AS total_checklists_realizados,
    count(*) FILTER (WHERE intervalo = 'Entrada'::text) AS total_checklists_entrada,
    count(*) FILTER (WHERE intervalo = 'Após Intervalo'::text) AS total_checklists_apos_intervalo,
    avg(total_perguntas_conforme::numeric / NULLIF(total_perguntas::numeric, 0::numeric)) AS media_pct_conforme_perguntas,
    avg(total_perguntas_nao_conforme::numeric / NULLIF(total_perguntas::numeric, 0::numeric)) AS media_pct_nao_conforme_perguntas,
    avg(total_categorias_conforme::numeric / NULLIF(total_categorias::numeric, 0::numeric)) AS media_pct_conforme_categorias,
    avg(total_categorias_nao_conforme::numeric / NULLIF(total_categorias::numeric, 0::numeric)) AS media_pct_nao_conforme_categorias,
    sum(total_perguntas_conforme) / NULLIF(sum(total_perguntas), 0::numeric) AS pct_geral_conforme_perguntas,
    sum(total_perguntas_nao_conforme) / NULLIF(sum(total_perguntas), 0::numeric) AS pct_geral_nao_conforme_perguntas,
    sum(total_categorias_conforme) / NULLIF(sum(total_categorias), 0::numeric) AS pct_geral_conforme_categorias,
    sum(total_categorias_nao_conforme) / NULLIF(sum(total_categorias), 0::numeric) AS pct_geral_nao_conforme_categorias
   FROM vw_checklists_individuais
  GROUP BY nome_modelo, nome_usuario
  ORDER BY nome_modelo, nome_usuario;

-- ----------------------------
-- View structure for metricas_atualizadas_2026_copy2
-- ----------------------------
DROP VIEW IF EXISTS "public"."metricas_atualizadas_2026_copy2";
CREATE VIEW "public"."metricas_atualizadas_2026_copy2" AS  WITH respostas_classificadas AS (
         SELECT f.id_formulario,
            f.data_criacao,
            f.id_modelo_fk,
            f.nome_modelo AS nome_modelo_original,
            f.id_usuario,
            f.nome_usuario AS nome_usuario_original,
            f.nome_categoria,
            f.nome_pergunta,
                CASE
                    WHEN lower(TRIM(BOTH FROM f.resposta)) = ANY (ARRAY['conforme'::text, 'n/a'::text]) THEN 'conforme'::text
                    WHEN lower(TRIM(BOTH FROM f.resposta)) = ANY (ARRAY['não conforme'::text, 'nao conforme'::text, 'não preenchido'::text, 'nao preenchido'::text]) THEN 'nao_conforme'::text
                    ELSE 'outro'::text
                END AS classificacao
           FROM formulario f
        ), perguntas_por_formulario AS (
         SELECT rc.id_formulario,
            ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text) AS data_e_horario,
            ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::date AS data_criacao,
            EXTRACT(year FROM ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text))::integer AS ano_criacao,
            ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone AS hora_relatorio,
            rc.id_modelo_fk,
            rc.nome_modelo_original,
            rc.id_usuario,
            rc.nome_usuario_original,
                CASE
                    WHEN ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '05:00:00'::time without time zone AND ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '09:55:00'::time without time zone OR ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '15:00:00'::time without time zone AND ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '20:30:00'::time without time zone THEN 'Entrada'::text
                    WHEN ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '11:00:00'::time without time zone AND ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '15:00:00'::time without time zone OR ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '21:10:00'::time without time zone OR ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '01:47:00'::time without time zone THEN 'Após Intervalo'::text
                    ELSE NULL::text
                END AS intervalo,
            count(*) AS total_perguntas,
            count(*) FILTER (WHERE rc.classificacao = 'conforme'::text) AS total_perguntas_conforme,
            count(*) FILTER (WHERE rc.classificacao = 'nao_conforme'::text) AS total_perguntas_nao_conforme
           FROM respostas_classificadas rc
          GROUP BY rc.id_formulario, rc.data_criacao, rc.id_modelo_fk, rc.nome_modelo_original, rc.id_usuario, rc.nome_usuario_original
        ), categorias_classificadas AS (
         SELECT rc.id_formulario,
            rc.nome_categoria,
            max(
                CASE
                    WHEN rc.classificacao = 'nao_conforme'::text THEN 1
                    ELSE 0
                END) AS eh_nao_conforme
           FROM respostas_classificadas rc
          GROUP BY rc.id_formulario, rc.nome_categoria
        ), categorias_por_formulario AS (
         SELECT cc.id_formulario,
            count(*) AS total_categorias,
            count(*) FILTER (WHERE cc.eh_nao_conforme = 0) AS total_categorias_conforme,
            count(*) FILTER (WHERE cc.eh_nao_conforme = 1) AS total_categorias_nao_conforme
           FROM categorias_classificadas cc
          GROUP BY cc.id_formulario
        )
 SELECT p.id_formulario,
    p.data_e_horario,
    p.data_criacao,
    p.ano_criacao,
    p.hora_relatorio,
    p.intervalo,
    COALESCE(mod.nome, p.nome_modelo_original::character varying) AS nome_modelo,
    marc.nome AS nome_marca,
    COALESCE(u.nome, p.nome_usuario_original::character varying) AS nome_usuario,
    u.turno,
    u.setor,
    u.ativo,
    p.total_perguntas,
    p.total_perguntas_conforme,
    p.total_perguntas_nao_conforme,
    COALESCE(c.total_categorias, 0::bigint) AS total_categorias,
    COALESCE(c.total_categorias_conforme, 0::bigint) AS total_categorias_conforme,
    COALESCE(c.total_categorias_nao_conforme, 0::bigint) AS total_categorias_nao_conforme
   FROM perguntas_por_formulario p
     LEFT JOIN categorias_por_formulario c ON p.id_formulario = c.id_formulario
     LEFT JOIN modelo mod ON p.id_modelo_fk IS NOT NULL AND p.id_modelo_fk = mod.id OR p.id_modelo_fk IS NULL AND mod.nome::text = p.nome_modelo_original
     LEFT JOIN marcas marc ON
        CASE
            WHEN mod.marca::text ~ '^[0-9]+$'::text THEN mod.marca::integer
            ELSE NULL::integer
        END = marc.id
     LEFT JOIN usuarios u ON p.id_usuario IS NOT NULL AND p.id_usuario = u.id OR p.id_usuario IS NULL AND u.nome::text = p.nome_usuario_original
  ORDER BY p.id_formulario DESC;

-- ----------------------------
-- View structure for top5_categorias_nao_conformes_por_modelo
-- ----------------------------
DROP VIEW IF EXISTS "public"."top5_categorias_nao_conformes_por_modelo";
CREATE VIEW "public"."top5_categorias_nao_conformes_por_modelo" AS  WITH categorias_nao_conformes_por_formulario AS (
         SELECT DISTINCT f.id_formulario,
            COALESCE(mod.nome, f.nome_modelo::character varying) AS nome_modelo,
            marc.nome AS nome_marca,
            f.nome_categoria
           FROM formulario f
             LEFT JOIN modelo mod ON f.id_modelo_fk IS NOT NULL AND f.id_modelo_fk = mod.id OR f.id_modelo_fk IS NULL AND mod.nome::text = f.nome_modelo
             LEFT JOIN marcas marc ON
                CASE
                    WHEN mod.marca::text ~ '^[0-9]+$'::text THEN mod.marca::integer
                    ELSE NULL::integer
                END = marc.id
          WHERE lower(TRIM(BOTH FROM f.resposta)) = ANY (ARRAY['não conforme'::text, 'nao conforme'::text, 'não preenchido'::text, 'nao preenchido'::text])
        ), contagem_geral_categorias AS (
         SELECT cn.nome_marca,
            cn.nome_modelo,
            cn.nome_categoria,
            count(cn.id_formulario) AS quantidade_formularios_nao_conforme
           FROM categorias_nao_conformes_por_formulario cn
          GROUP BY cn.nome_marca, cn.nome_modelo, cn.nome_categoria
        ), ranking_categorias AS (
         SELECT cg.nome_marca,
            cg.nome_modelo,
            cg.nome_categoria,
            cg.quantidade_formularios_nao_conforme,
            row_number() OVER (PARTITION BY cg.nome_modelo ORDER BY cg.quantidade_formularios_nao_conforme DESC) AS ranking
           FROM contagem_geral_categorias cg
        )
 SELECT nome_marca,
    nome_modelo,
    nome_categoria,
    quantidade_formularios_nao_conforme,
    ranking
   FROM ranking_categorias r
  WHERE ranking <= 5
  ORDER BY nome_marca, nome_modelo, ranking;

-- ----------------------------
-- View structure for vw_checklists_consolidados_3_copy1
-- ----------------------------
DROP VIEW IF EXISTS "public"."vw_checklists_consolidados_3_copy1";
CREATE VIEW "public"."vw_checklists_consolidados_3_copy1" AS  WITH vw_checklists_individuais AS (
         WITH respostas_classificadas AS (
                 SELECT f.id_formulario,
                    f.data_criacao,
                    f.nome_modelo,
                    f.nome_usuario,
                    f.nome_categoria,
                    f.nome_pergunta,
                        CASE
                            WHEN lower(TRIM(BOTH FROM f.resposta)) = ANY (ARRAY['conforme'::text, 'n/a'::text]) THEN 'conforme'::text
                            WHEN lower(TRIM(BOTH FROM f.resposta)) = ANY (ARRAY['não conforme'::text, 'nao conforme'::text, 'não preenchido'::text, 'nao preenchido'::text]) THEN 'nao_conforme'::text
                            ELSE 'outro'::text
                        END AS classificacao
                   FROM formulario f
                ), perguntas_por_formulario AS (
                 SELECT respostas_classificadas.id_formulario,
                    respostas_classificadas.data_criacao,
                    ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text) AS data_criacao_sp,
                    ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone AS hora_relatorio,
                        CASE
                            WHEN ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '05:00:00'::time without time zone AND ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '09:55:00'::time without time zone OR ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '15:00:00'::time without time zone AND ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '20:30:00'::time without time zone THEN 'Entrada'::text
                            WHEN ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '11:00:00'::time without time zone AND ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '15:00:00'::time without time zone OR ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '21:10:00'::time without time zone OR ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '01:47:00'::time without time zone THEN 'Após Intervalo'::text
                            ELSE NULL::text
                        END AS intervalo,
                    respostas_classificadas.nome_modelo,
                    respostas_classificadas.nome_usuario,
                    count(*) AS total_perguntas,
                    count(*) FILTER (WHERE respostas_classificadas.classificacao = 'conforme'::text) AS total_perguntas_conforme,
                    count(*) FILTER (WHERE respostas_classificadas.classificacao = 'nao_conforme'::text) AS total_perguntas_nao_conforme
                   FROM respostas_classificadas
                  GROUP BY respostas_classificadas.id_formulario, respostas_classificadas.data_criacao, respostas_classificadas.nome_modelo, respostas_classificadas.nome_usuario
                ), categorias_classificadas AS (
                 SELECT respostas_classificadas.id_formulario,
                    respostas_classificadas.nome_categoria,
                    max(
                        CASE
                            WHEN respostas_classificadas.classificacao = 'nao_conforme'::text THEN 1
                            ELSE 0
                        END) AS eh_nao_conforme
                   FROM respostas_classificadas
                  GROUP BY respostas_classificadas.id_formulario, respostas_classificadas.nome_categoria
                ), categorias_por_formulario AS (
                 SELECT categorias_classificadas.id_formulario,
                    count(*) AS total_categorias,
                    count(*) FILTER (WHERE categorias_classificadas.eh_nao_conforme = 0) AS total_categorias_conforme,
                    count(*) FILTER (WHERE categorias_classificadas.eh_nao_conforme = 1) AS total_categorias_nao_conforme
                   FROM categorias_classificadas
                  GROUP BY categorias_classificadas.id_formulario
                )
         SELECT p.id_formulario,
            p.data_criacao AS data_criacao_utc,
            p.data_criacao_sp,
            p.data_criacao_sp::date AS dia_sp,
            EXTRACT(isodow FROM p.data_criacao_sp) AS dia_semana,
            p.intervalo,
            p.nome_modelo,
            p.nome_usuario,
            p.total_perguntas,
            p.total_perguntas_conforme,
            p.total_perguntas_nao_conforme,
            COALESCE(c.total_categorias, 0::bigint) AS total_categorias,
            COALESCE(c.total_categorias_conforme, 0::bigint) AS total_categorias_conforme,
            COALESCE(c.total_categorias_nao_conforme, 0::bigint) AS total_categorias_nao_conforme
           FROM perguntas_por_formulario p
             LEFT JOIN categorias_por_formulario c ON p.id_formulario = c.id_formulario
        ), modelo_info AS (
         SELECT vw_checklists_individuais.nome_modelo,
            max(vw_checklists_individuais.total_perguntas) AS total_perguntas_modelo,
            max(vw_checklists_individuais.total_categorias) AS total_categorias_modelo
           FROM vw_checklists_individuais
          GROUP BY vw_checklists_individuais.nome_modelo
        ), paridade_diaria_flags AS (
         SELECT vw_checklists_individuais.dia_sp,
            vw_checklists_individuais.nome_modelo,
            vw_checklists_individuais.nome_usuario,
            bool_or(vw_checklists_individuais.intervalo = 'Entrada'::text) AS tem_entrada,
            bool_or(vw_checklists_individuais.intervalo = 'Após Intervalo'::text) AS tem_apos_intervalo
           FROM vw_checklists_individuais
          WHERE vw_checklists_individuais.dia_semana <= 5::numeric AND vw_checklists_individuais.intervalo IS NOT NULL
          GROUP BY vw_checklists_individuais.dia_sp, vw_checklists_individuais.nome_modelo, vw_checklists_individuais.nome_usuario
        ), ghost_checklists AS (
         SELECT p.dia_sp,
            p.nome_modelo,
            p.nome_usuario,
            'Entrada'::text AS intervalo,
            m.total_perguntas_modelo AS total_perguntas,
            0 AS total_perguntas_conforme,
            m.total_perguntas_modelo AS total_perguntas_nao_conforme,
            m.total_categorias_modelo AS total_categorias,
            0 AS total_categorias_conforme,
            m.total_categorias_modelo AS total_categorias_nao_conforme
           FROM paridade_diaria_flags p
             JOIN modelo_info m ON p.nome_modelo = m.nome_modelo
          WHERE p.tem_apos_intervalo AND NOT p.tem_entrada
        UNION ALL
         SELECT p.dia_sp,
            p.nome_modelo,
            p.nome_usuario,
            'Após Intervalo'::text AS intervalo,
            m.total_perguntas_modelo AS total_perguntas,
            0 AS total_perguntas_conforme,
            m.total_perguntas_modelo AS total_perguntas_nao_conforme,
            m.total_categorias_modelo AS total_categorias,
            0 AS total_categorias_conforme,
            m.total_categorias_modelo AS total_categorias_nao_conforme
           FROM paridade_diaria_flags p
             JOIN modelo_info m ON p.nome_modelo = m.nome_modelo
          WHERE p.tem_entrada AND NOT p.tem_apos_intervalo
        ), uniao_checklists AS (
         SELECT vw_checklists_individuais.nome_modelo,
            vw_checklists_individuais.nome_usuario,
            vw_checklists_individuais.intervalo,
            vw_checklists_individuais.total_perguntas,
            vw_checklists_individuais.total_perguntas_conforme,
            vw_checklists_individuais.total_perguntas_nao_conforme,
            vw_checklists_individuais.total_categorias,
            vw_checklists_individuais.total_categorias_conforme,
            vw_checklists_individuais.total_categorias_nao_conforme,
            0 AS eh_ficticio
           FROM vw_checklists_individuais
          WHERE vw_checklists_individuais.intervalo IS NOT NULL
        UNION ALL
         SELECT ghost_checklists.nome_modelo,
            ghost_checklists.nome_usuario,
            ghost_checklists.intervalo,
            ghost_checklists.total_perguntas,
            ghost_checklists.total_perguntas_conforme,
            ghost_checklists.total_perguntas_nao_conforme,
            ghost_checklists.total_categorias,
            ghost_checklists.total_categorias_conforme,
            ghost_checklists.total_categorias_nao_conforme,
            1 AS eh_ficticio
           FROM ghost_checklists
        )
 SELECT nome_modelo,
    nome_usuario,
    count(*) AS total_checklists_contabilizados,
    count(*) FILTER (WHERE intervalo = 'Entrada'::text) AS total_checklists_entrada,
    count(*) FILTER (WHERE intervalo = 'Após Intervalo'::text) AS total_checklists_apos_intervalo,
    count(*) FILTER (WHERE eh_ficticio = 0) AS total_checklists_reais,
    count(*) FILTER (WHERE eh_ficticio = 0 AND intervalo = 'Entrada'::text) AS total_reais_entrada,
    count(*) FILTER (WHERE eh_ficticio = 0 AND intervalo = 'Após Intervalo'::text) AS total_reais_apos_intervalo,
    count(*) FILTER (WHERE eh_ficticio = 1) AS total_checklists_ficticios,
    count(*) FILTER (WHERE eh_ficticio = 1 AND intervalo = 'Entrada'::text) AS total_ficticios_entrada,
    count(*) FILTER (WHERE eh_ficticio = 1 AND intervalo = 'Após Intervalo'::text) AS total_ficticios_apos_intervalo,
    sum(total_perguntas_conforme) / NULLIF(sum(total_perguntas), 0::numeric) AS pct_geral_conforme_perguntas,
    sum(total_perguntas_nao_conforme) / NULLIF(sum(total_perguntas), 0::numeric) AS pct_geral_nao_conforme_perguntas,
    sum(total_perguntas_conforme) FILTER (WHERE intervalo = 'Entrada'::text) / NULLIF(sum(total_perguntas) FILTER (WHERE intervalo = 'Entrada'::text), 0::numeric) AS pct_entrada_conforme_perguntas,
    sum(total_perguntas_nao_conforme) FILTER (WHERE intervalo = 'Entrada'::text) / NULLIF(sum(total_perguntas) FILTER (WHERE intervalo = 'Entrada'::text), 0::numeric) AS pct_entrada_nao_conforme_perguntas,
    sum(total_perguntas_conforme) FILTER (WHERE intervalo = 'Após Intervalo'::text) / NULLIF(sum(total_perguntas) FILTER (WHERE intervalo = 'Após Intervalo'::text), 0::numeric) AS pct_apos_intervalo_conforme_perguntas,
    sum(total_perguntas_nao_conforme) FILTER (WHERE intervalo = 'Após Intervalo'::text) / NULLIF(sum(total_perguntas) FILTER (WHERE intervalo = 'Após Intervalo'::text), 0::numeric) AS pct_apos_intervalo_nao_conforme_perguntas,
    sum(total_categorias_conforme) / NULLIF(sum(total_categorias), 0::numeric) AS pct_geral_conforme_categorias,
    sum(total_categorias_nao_conforme) / NULLIF(sum(total_categorias), 0::numeric) AS pct_geral_nao_conforme_categorias,
    sum(total_perguntas_conforme) FILTER (WHERE eh_ficticio = 0) / NULLIF(sum(total_perguntas) FILTER (WHERE eh_ficticio = 0), 0::numeric) AS pct_real_geral_conforme_perguntas,
    sum(total_perguntas_nao_conforme) FILTER (WHERE eh_ficticio = 0) / NULLIF(sum(total_perguntas) FILTER (WHERE eh_ficticio = 0), 0::numeric) AS pct_real_geral_nao_conforme_perguntas
   FROM uniao_checklists
  GROUP BY nome_modelo, nome_usuario
  ORDER BY nome_modelo, nome_usuario;

-- ----------------------------
-- View structure for vw_checklists_consolidados_3
-- ----------------------------
DROP VIEW IF EXISTS "public"."vw_checklists_consolidados_3";
CREATE VIEW "public"."vw_checklists_consolidados_3" AS  WITH vw_checklists_individuais AS (
         WITH respostas_classificadas AS (
                 SELECT f.id_formulario,
                    f.data_criacao,
                    f.nome_modelo,
                    f.nome_usuario,
                    f.nome_categoria,
                    f.nome_pergunta,
                        CASE
                            WHEN lower(TRIM(BOTH FROM f.resposta)) = ANY (ARRAY['conforme'::text, 'n/a'::text]) THEN 'conforme'::text
                            WHEN lower(TRIM(BOTH FROM f.resposta)) = ANY (ARRAY['não conforme'::text, 'nao conforme'::text, 'não preenchido'::text, 'nao preenchido'::text]) THEN 'nao_conforme'::text
                            ELSE 'outro'::text
                        END AS classificacao
                   FROM formulario f
                  WHERE EXTRACT(year FROM ((f.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)) = 2026::numeric
                ), perguntas_por_formulario AS (
                 SELECT respostas_classificadas.id_formulario,
                    respostas_classificadas.data_criacao,
                    ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text) AS data_criacao_sp,
                    ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone AS hora_relatorio,
                        CASE
                            WHEN ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '05:00:00'::time without time zone AND ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '09:55:00'::time without time zone OR ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '15:00:00'::time without time zone AND ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '20:30:00'::time without time zone THEN 'Entrada'::text
                            WHEN ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '11:00:00'::time without time zone AND ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '15:00:00'::time without time zone OR ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '21:10:00'::time without time zone OR ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '01:47:00'::time without time zone THEN 'Após Intervalo'::text
                            ELSE NULL::text
                        END AS intervalo,
                    respostas_classificadas.nome_modelo,
                    respostas_classificadas.nome_usuario,
                    count(*) AS total_perguntas,
                    count(*) FILTER (WHERE respostas_classificadas.classificacao = 'conforme'::text) AS total_perguntas_conforme,
                    count(*) FILTER (WHERE respostas_classificadas.classificacao = 'nao_conforme'::text) AS total_perguntas_nao_conforme
                   FROM respostas_classificadas
                  GROUP BY respostas_classificadas.id_formulario, respostas_classificadas.data_criacao, respostas_classificadas.nome_modelo, respostas_classificadas.nome_usuario
                ), categorias_classificadas AS (
                 SELECT respostas_classificadas.id_formulario,
                    respostas_classificadas.nome_categoria,
                    max(
                        CASE
                            WHEN respostas_classificadas.classificacao = 'nao_conforme'::text THEN 1
                            ELSE 0
                        END) AS eh_nao_conforme
                   FROM respostas_classificadas
                  GROUP BY respostas_classificadas.id_formulario, respostas_classificadas.nome_categoria
                ), categorias_por_formulario AS (
                 SELECT categorias_classificadas.id_formulario,
                    count(*) AS total_categorias,
                    count(*) FILTER (WHERE categorias_classificadas.eh_nao_conforme = 0) AS total_categorias_conforme,
                    count(*) FILTER (WHERE categorias_classificadas.eh_nao_conforme = 1) AS total_categorias_nao_conforme
                   FROM categorias_classificadas
                  GROUP BY categorias_classificadas.id_formulario
                )
         SELECT p.id_formulario,
            p.data_criacao AS data_criacao_utc,
            p.data_criacao_sp,
            p.data_criacao_sp::date AS dia_sp,
            EXTRACT(isodow FROM p.data_criacao_sp) AS dia_semana,
            p.intervalo,
            p.nome_modelo,
            p.nome_usuario,
            p.total_perguntas,
            p.total_perguntas_conforme,
            p.total_perguntas_nao_conforme,
            COALESCE(c.total_categorias, 0::bigint) AS total_categorias,
            COALESCE(c.total_categorias_conforme, 0::bigint) AS total_categorias_conforme,
            COALESCE(c.total_categorias_nao_conforme, 0::bigint) AS total_categorias_nao_conforme
           FROM perguntas_por_formulario p
             LEFT JOIN categorias_por_formulario c ON p.id_formulario = c.id_formulario
        ), modelo_info AS (
         SELECT vw_checklists_individuais.nome_modelo,
            max(vw_checklists_individuais.total_perguntas) AS total_perguntas_modelo,
            max(vw_checklists_individuais.total_categorias) AS total_categorias_modelo
           FROM vw_checklists_individuais
          GROUP BY vw_checklists_individuais.nome_modelo
        ), paridade_diaria_flags AS (
         SELECT vw_checklists_individuais.dia_sp,
            vw_checklists_individuais.nome_modelo,
            vw_checklists_individuais.nome_usuario,
            bool_or(vw_checklists_individuais.intervalo = 'Entrada'::text) AS tem_entrada,
            bool_or(vw_checklists_individuais.intervalo = 'Após Intervalo'::text) AS tem_apos_intervalo
           FROM vw_checklists_individuais
          WHERE vw_checklists_individuais.dia_semana <= 5::numeric AND vw_checklists_individuais.intervalo IS NOT NULL
          GROUP BY vw_checklists_individuais.dia_sp, vw_checklists_individuais.nome_modelo, vw_checklists_individuais.nome_usuario
        ), ghost_checklists AS (
         SELECT p.dia_sp,
            p.nome_modelo,
            p.nome_usuario,
            'Entrada'::text AS intervalo,
            m.total_perguntas_modelo AS total_perguntas,
            0 AS total_perguntas_conforme,
            m.total_perguntas_modelo AS total_perguntas_nao_conforme,
            m.total_categorias_modelo AS total_categorias,
            0 AS total_categorias_conforme,
            m.total_categorias_modelo AS total_categorias_nao_conforme
           FROM paridade_diaria_flags p
             JOIN modelo_info m ON p.nome_modelo = m.nome_modelo
          WHERE p.tem_apos_intervalo AND NOT p.tem_entrada
        UNION ALL
         SELECT p.dia_sp,
            p.nome_modelo,
            p.nome_usuario,
            'Após Intervalo'::text AS intervalo,
            m.total_perguntas_modelo AS total_perguntas,
            0 AS total_perguntas_conforme,
            m.total_perguntas_modelo AS total_perguntas_nao_conforme,
            m.total_categorias_modelo AS total_categorias,
            0 AS total_categorias_conforme,
            m.total_categorias_modelo AS total_categorias_nao_conforme
           FROM paridade_diaria_flags p
             JOIN modelo_info m ON p.nome_modelo = m.nome_modelo
          WHERE p.tem_entrada AND NOT p.tem_apos_intervalo
        ), uniao_checklists AS (
         SELECT vw_checklists_individuais.nome_modelo,
            vw_checklists_individuais.nome_usuario,
            vw_checklists_individuais.intervalo,
            vw_checklists_individuais.total_perguntas,
            vw_checklists_individuais.total_perguntas_conforme,
            vw_checklists_individuais.total_perguntas_nao_conforme,
            vw_checklists_individuais.total_categorias,
            vw_checklists_individuais.total_categorias_conforme,
            vw_checklists_individuais.total_categorias_nao_conforme,
            0 AS eh_ficticio
           FROM vw_checklists_individuais
          WHERE vw_checklists_individuais.intervalo IS NOT NULL
        UNION ALL
         SELECT ghost_checklists.nome_modelo,
            ghost_checklists.nome_usuario,
            ghost_checklists.intervalo,
            ghost_checklists.total_perguntas,
            ghost_checklists.total_perguntas_conforme,
            ghost_checklists.total_perguntas_nao_conforme,
            ghost_checklists.total_categorias,
            ghost_checklists.total_categorias_conforme,
            ghost_checklists.total_categorias_nao_conforme,
            1 AS eh_ficticio
           FROM ghost_checklists
        )
 SELECT nome_modelo,
    nome_usuario,
    count(*) AS total_checklists_contabilizados,
    count(*) FILTER (WHERE intervalo = 'Entrada'::text) AS total_checklists_entrada,
    count(*) FILTER (WHERE intervalo = 'Após Intervalo'::text) AS total_checklists_apos_intervalo,
    count(*) FILTER (WHERE eh_ficticio = 0) AS total_checklists_reais,
    count(*) FILTER (WHERE eh_ficticio = 0 AND intervalo = 'Entrada'::text) AS total_reais_entrada,
    count(*) FILTER (WHERE eh_ficticio = 0 AND intervalo = 'Após Intervalo'::text) AS total_reais_apos_intervalo,
    count(*) FILTER (WHERE eh_ficticio = 1) AS total_checklists_ficticios,
    count(*) FILTER (WHERE eh_ficticio = 1 AND intervalo = 'Entrada'::text) AS total_ficticios_entrada,
    count(*) FILTER (WHERE eh_ficticio = 1 AND intervalo = 'Após Intervalo'::text) AS total_ficticios_apos_intervalo,
    sum(total_perguntas_conforme) / NULLIF(sum(total_perguntas), 0::numeric) AS pct_geral_conforme_perguntas,
    sum(total_perguntas_nao_conforme) / NULLIF(sum(total_perguntas), 0::numeric) AS pct_geral_nao_conforme_perguntas,
    sum(total_perguntas_conforme) FILTER (WHERE intervalo = 'Entrada'::text) / NULLIF(sum(total_perguntas) FILTER (WHERE intervalo = 'Entrada'::text), 0::numeric) AS pct_entrada_conforme_perguntas,
    sum(total_perguntas_nao_conforme) FILTER (WHERE intervalo = 'Entrada'::text) / NULLIF(sum(total_perguntas) FILTER (WHERE intervalo = 'Entrada'::text), 0::numeric) AS pct_entrada_nao_conforme_perguntas,
    sum(total_perguntas_conforme) FILTER (WHERE intervalo = 'Após Intervalo'::text) / NULLIF(sum(total_perguntas) FILTER (WHERE intervalo = 'Após Intervalo'::text), 0::numeric) AS pct_apos_intervalo_conforme_perguntas,
    sum(total_perguntas_nao_conforme) FILTER (WHERE intervalo = 'Após Intervalo'::text) / NULLIF(sum(total_perguntas) FILTER (WHERE intervalo = 'Após Intervalo'::text), 0::numeric) AS pct_apos_intervalo_nao_conforme_perguntas,
    sum(total_categorias_conforme) / NULLIF(sum(total_categorias), 0::numeric) AS pct_geral_conforme_categorias,
    sum(total_categorias_nao_conforme) / NULLIF(sum(total_categorias), 0::numeric) AS pct_geral_nao_conforme_categorias,
    sum(total_perguntas_conforme) FILTER (WHERE eh_ficticio = 0) / NULLIF(sum(total_perguntas) FILTER (WHERE eh_ficticio = 0), 0::numeric) AS pct_real_geral_conforme_perguntas,
    sum(total_perguntas_nao_conforme) FILTER (WHERE eh_ficticio = 0) / NULLIF(sum(total_perguntas) FILTER (WHERE eh_ficticio = 0), 0::numeric) AS pct_real_geral_nao_conforme_perguntas
   FROM uniao_checklists
  GROUP BY nome_modelo, nome_usuario
  ORDER BY nome_modelo, nome_usuario;

-- ----------------------------
-- View structure for vw_checklists_consolidados_2
-- ----------------------------
DROP VIEW IF EXISTS "public"."vw_checklists_consolidados_2";
CREATE VIEW "public"."vw_checklists_consolidados_2" AS  WITH vw_checklists_individuais AS (
         WITH respostas_classificadas AS (
                 SELECT f.id_formulario,
                    f.data_criacao,
                    f.nome_modelo,
                    f.nome_usuario,
                    f.nome_categoria,
                    f.nome_pergunta,
                        CASE
                            WHEN lower(TRIM(BOTH FROM f.resposta)) = ANY (ARRAY['conforme'::text, 'n/a'::text]) THEN 'conforme'::text
                            WHEN lower(TRIM(BOTH FROM f.resposta)) = ANY (ARRAY['não conforme'::text, 'nao conforme'::text, 'não preenchido'::text, 'nao preenchido'::text]) THEN 'nao_conforme'::text
                            ELSE 'outro'::text
                        END AS classificacao
                   FROM formulario f
                ), perguntas_por_formulario AS (
                 SELECT respostas_classificadas.id_formulario,
                    respostas_classificadas.data_criacao,
                    ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text) AS data_criacao_sp,
                    ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone AS hora_relatorio,
                        CASE
                            WHEN ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '05:00:00'::time without time zone AND ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '09:55:00'::time without time zone OR ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '15:00:00'::time without time zone AND ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '20:30:00'::time without time zone THEN 'Entrada'::text
                            WHEN ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '11:00:00'::time without time zone AND ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '15:00:00'::time without time zone OR ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '21:10:00'::time without time zone OR ((respostas_classificadas.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '01:47:00'::time without time zone THEN 'Após Intervalo'::text
                            ELSE NULL::text
                        END AS intervalo,
                    respostas_classificadas.nome_modelo,
                    respostas_classificadas.nome_usuario,
                    count(*) AS total_perguntas,
                    count(*) FILTER (WHERE respostas_classificadas.classificacao = 'conforme'::text) AS total_perguntas_conforme,
                    count(*) FILTER (WHERE respostas_classificadas.classificacao = 'nao_conforme'::text) AS total_perguntas_nao_conforme
                   FROM respostas_classificadas
                  GROUP BY respostas_classificadas.id_formulario, respostas_classificadas.data_criacao, respostas_classificadas.nome_modelo, respostas_classificadas.nome_usuario
                ), categorias_classificadas AS (
                 SELECT respostas_classificadas.id_formulario,
                    respostas_classificadas.nome_categoria,
                    max(
                        CASE
                            WHEN respostas_classificadas.classificacao = 'nao_conforme'::text THEN 1
                            ELSE 0
                        END) AS eh_nao_conforme
                   FROM respostas_classificadas
                  GROUP BY respostas_classificadas.id_formulario, respostas_classificadas.nome_categoria
                ), categorias_por_formulario AS (
                 SELECT categorias_classificadas.id_formulario,
                    count(*) AS total_categorias,
                    count(*) FILTER (WHERE categorias_classificadas.eh_nao_conforme = 0) AS total_categorias_conforme,
                    count(*) FILTER (WHERE categorias_classificadas.eh_nao_conforme = 1) AS total_categorias_nao_conforme
                   FROM categorias_classificadas
                  GROUP BY categorias_classificadas.id_formulario
                )
         SELECT p.id_formulario,
            p.data_criacao AS data_criacao_utc,
            p.data_criacao_sp,
            p.hora_relatorio,
            p.intervalo,
            p.nome_modelo,
            p.nome_usuario,
            p.total_perguntas,
            p.total_perguntas_conforme,
            p.total_perguntas_nao_conforme,
            COALESCE(c.total_categorias, 0::bigint) AS total_categorias,
            COALESCE(c.total_categorias_conforme, 0::bigint) AS total_categorias_conforme,
            COALESCE(c.total_categorias_nao_conforme, 0::bigint) AS total_categorias_nao_conforme
           FROM perguntas_por_formulario p
             LEFT JOIN categorias_por_formulario c ON p.id_formulario = c.id_formulario
        )
 SELECT nome_modelo,
    nome_usuario,
    count(*) AS total_checklists_realizados,
    count(*) FILTER (WHERE intervalo = 'Entrada'::text) AS total_checklists_entrada,
    count(*) FILTER (WHERE intervalo = 'Após Intervalo'::text) AS total_checklists_apos_intervalo,
    sum(total_perguntas_conforme) / NULLIF(sum(total_perguntas), 0::numeric) AS percentual_conforme_perguntas,
    sum(total_perguntas_nao_conforme) / NULLIF(sum(total_perguntas), 0::numeric) AS percentual_nao_conforme_perguntas,
    sum(total_categorias_conforme) / NULLIF(sum(total_categorias), 0::numeric) AS percentual_conforme_categorias,
    sum(total_categorias_nao_conforme) / NULLIF(sum(total_categorias), 0::numeric) AS percentual_nao_conforme_categorias
   FROM vw_checklists_individuais
  GROUP BY nome_modelo, nome_usuario
  ORDER BY nome_modelo, nome_usuario;

-- ----------------------------
-- View structure for vw_ultimo_checklist_por_usuario
-- ----------------------------
DROP VIEW IF EXISTS "public"."vw_ultimo_checklist_por_usuario";
CREATE VIEW "public"."vw_ultimo_checklist_por_usuario" AS  WITH dados_formulario AS (
         SELECT f.id_formulario,
            f.data_criacao,
            f.nome_usuario
           FROM formulario f
          GROUP BY f.id_formulario, f.data_criacao, f.nome_usuario
        ), classificado_por_horario AS (
         SELECT dados_formulario.nome_usuario,
            ((dados_formulario.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text) AS data_criacao_sp,
                CASE
                    WHEN ((dados_formulario.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '05:00:00'::time without time zone AND ((dados_formulario.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '09:55:00'::time without time zone OR ((dados_formulario.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '15:00:00'::time without time zone AND ((dados_formulario.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '20:30:00'::time without time zone THEN 'Entrada'::text
                    WHEN ((dados_formulario.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '11:00:00'::time without time zone AND ((dados_formulario.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '15:00:00'::time without time zone OR ((dados_formulario.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '21:10:00'::time without time zone OR ((dados_formulario.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '01:47:00'::time without time zone THEN 'Após Intervalo'::text
                    ELSE NULL::text
                END AS intervalo
           FROM dados_formulario
        )
 SELECT nome_usuario,
    max(data_criacao_sp) AS data_ultimo_checklist
   FROM classificado_por_horario
  WHERE intervalo IS NOT NULL
  GROUP BY nome_usuario
  ORDER BY nome_usuario;

-- ----------------------------
-- View structure for metricas_atualizadas_2026
-- ----------------------------
DROP VIEW IF EXISTS "public"."metricas_atualizadas_2026";
CREATE VIEW "public"."metricas_atualizadas_2026" AS  WITH respostas_classificadas AS (
         SELECT f.id_formulario,
            f.data_criacao,
            f.id_modelo_fk,
            f.nome_modelo AS nome_modelo_original,
            f.id_usuario,
            f.nome_usuario AS nome_usuario_original,
            f.nome_categoria,
            f.nome_pergunta,
                CASE
                    WHEN lower(TRIM(BOTH FROM f.resposta)) = ANY (ARRAY['conforme'::text, 'n/a'::text]) THEN 'conforme'::text
                    WHEN lower(TRIM(BOTH FROM f.resposta)) = ANY (ARRAY['não conforme'::text, 'nao conforme'::text, 'não preenchido'::text, 'nao preenchido'::text]) THEN 'nao_conforme'::text
                    ELSE 'outro'::text
                END AS classificacao
           FROM formulario f
        ), perguntas_por_formulario AS (
         SELECT rc.id_formulario,
            ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text) AS data_e_horario,
            ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::date AS data_criacao,
            EXTRACT(year FROM ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text))::integer AS ano_criacao,
            ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone AS hora_relatorio,
            rc.id_modelo_fk,
            rc.nome_modelo_original,
            rc.id_usuario,
            rc.nome_usuario_original,
                CASE
                    WHEN ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '05:00:00'::time without time zone AND ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '09:55:00'::time without time zone OR ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '15:00:00'::time without time zone AND ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '20:30:00'::time without time zone THEN 'Entrada'::text
                    WHEN ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '11:00:00'::time without time zone AND ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '15:00:00'::time without time zone OR ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= '21:10:00'::time without time zone OR ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= '01:47:00'::time without time zone THEN 'Após Intervalo'::text
                    ELSE NULL::text
                END AS intervalo,
            count(*) AS total_perguntas,
            count(*) FILTER (WHERE rc.classificacao = 'conforme'::text) AS total_perguntas_conforme,
            count(*) FILTER (WHERE rc.classificacao = 'nao_conforme'::text) AS total_perguntas_nao_conforme
           FROM respostas_classificadas rc
          GROUP BY rc.id_formulario, rc.data_criacao, rc.id_modelo_fk, rc.nome_modelo_original, rc.id_usuario, rc.nome_usuario_original
        ), categorias_classificadas AS (
         SELECT rc.id_formulario,
            rc.nome_categoria,
            max(
                CASE
                    WHEN rc.classificacao = 'nao_conforme'::text THEN 1
                    ELSE 0
                END) AS eh_nao_conforme
           FROM respostas_classificadas rc
          GROUP BY rc.id_formulario, rc.nome_categoria
        ), categorias_por_formulario AS (
         SELECT cc.id_formulario,
            count(*) AS total_categorias,
            count(*) FILTER (WHERE cc.eh_nao_conforme = 0) AS total_categorias_conforme,
            count(*) FILTER (WHERE cc.eh_nao_conforme = 1) AS total_categorias_nao_conforme
           FROM categorias_classificadas cc
          GROUP BY cc.id_formulario
        ), checklists_reais AS (
         SELECT p.id_formulario,
            p.data_e_horario,
            p.data_criacao,
            p.ano_criacao,
            p.hora_relatorio,
            p.id_modelo_fk,
            p.nome_modelo_original,
            p.id_usuario,
            p.nome_usuario_original,
            p.intervalo,
            p.total_perguntas,
            p.total_perguntas_conforme,
            p.total_perguntas_nao_conforme,
            COALESCE(c.total_categorias, 0::bigint) AS total_categorias,
            COALESCE(c.total_categorias_conforme, 0::bigint) AS total_categorias_conforme,
            COALESCE(c.total_categorias_nao_conforme, 0::bigint) AS total_categorias_nao_conforme
           FROM perguntas_por_formulario p
             LEFT JOIN categorias_por_formulario c ON p.id_formulario = c.id_formulario
        ), dias_validos AS (
         SELECT DISTINCT checklists_reais.data_criacao,
            checklists_reais.ano_criacao
           FROM checklists_reais
          WHERE EXTRACT(isodow FROM checklists_reais.data_criacao) <= 5::numeric
        ), usuarios_com_atividade AS (
         SELECT cr.id_usuario,
            cr.nome_usuario_original,
            min(cr.data_criacao) AS data_primeiro_checklist,
            min(cr.data_e_horario) AS timestamp_criacao_usuario
           FROM checklists_reais cr
             JOIN usuarios u_1 ON cr.id_usuario IS NOT NULL AND cr.id_usuario = u_1.id OR cr.id_usuario IS NULL AND u_1.nome::text = cr.nome_usuario_original
          WHERE u_1.ativo = ANY (ARRAY[1, 2])
          GROUP BY cr.id_usuario, cr.nome_usuario_original
        ), checklists_esperados AS (
         SELECT d.data_criacao,
            d.ano_criacao,
            u_1.id_usuario,
            u_1.nome_usuario_original,
            i.intervalo
           FROM dias_validos d
             CROSS JOIN usuarios_com_atividade u_1
             CROSS JOIN ( SELECT unnest(ARRAY['Entrada'::text, 'Após Intervalo'::text]) AS intervalo) i
          WHERE d.data_criacao >= u_1.data_primeiro_checklist
        ), checklists_faltantes AS (
         SELECT '-9999'::integer AS id_formulario,
            e.data_criacao::timestamp without time zone AS data_e_horario,
            e.data_criacao,
            e.ano_criacao,
            '00:00:00'::time without time zone AS hora_relatorio,
            NULL::integer AS id_modelo_fk,
            'Não Realizado (Fictício)'::character varying AS nome_modelo_original,
            e.id_usuario,
            e.nome_usuario_original,
            e.intervalo,
            1::bigint AS total_perguntas,
            0::bigint AS total_perguntas_conforme,
            1::bigint AS total_perguntas_nao_conforme,
            1::bigint AS total_categorias,
            0::bigint AS total_categorias_conforme,
            1::bigint AS total_categorias_nao_conforme
           FROM checklists_esperados e
             LEFT JOIN checklists_reais r ON e.data_criacao = r.data_criacao AND (e.id_usuario = r.id_usuario OR e.id_usuario IS NULL AND r.id_usuario IS NULL AND e.nome_usuario_original = r.nome_usuario_original) AND e.intervalo = r.intervalo
          WHERE r.data_criacao IS NULL
        ), todos_checklists AS (
         SELECT checklists_reais.id_formulario,
            checklists_reais.data_e_horario,
            checklists_reais.data_criacao,
            checklists_reais.ano_criacao,
            checklists_reais.hora_relatorio,
            checklists_reais.id_modelo_fk,
            checklists_reais.nome_modelo_original,
            checklists_reais.id_usuario,
            checklists_reais.nome_usuario_original,
            checklists_reais.intervalo,
            checklists_reais.total_perguntas,
            checklists_reais.total_perguntas_conforme,
            checklists_reais.total_perguntas_nao_conforme,
            checklists_reais.total_categorias,
            checklists_reais.total_categorias_conforme,
            checklists_reais.total_categorias_nao_conforme,
            false AS eh_ficticio
           FROM checklists_reais
        UNION ALL
         SELECT checklists_faltantes.id_formulario,
            checklists_faltantes.data_e_horario,
            checklists_faltantes.data_criacao,
            checklists_faltantes.ano_criacao,
            checklists_faltantes.hora_relatorio,
            checklists_faltantes.id_modelo_fk,
            checklists_faltantes.nome_modelo_original,
            checklists_faltantes.id_usuario,
            checklists_faltantes.nome_usuario_original,
            checklists_faltantes.intervalo,
            checklists_faltantes.total_perguntas,
            checklists_faltantes.total_perguntas_conforme,
            checklists_faltantes.total_perguntas_nao_conforme,
            checklists_faltantes.total_categorias,
            checklists_faltantes.total_categorias_conforme,
            checklists_faltantes.total_categorias_nao_conforme,
            true AS eh_ficticio
           FROM checklists_faltantes
        )
 SELECT t.id_formulario,
    t.data_e_horario,
    t.data_criacao,
    t.ano_criacao,
    t.hora_relatorio,
    t.intervalo,
    COALESCE(mod.nome, t.nome_modelo_original::character varying) AS nome_modelo,
        CASE
            WHEN marc.nome IS NULL OR TRIM(BOTH FROM marc.nome::text) = ''::text THEN
            CASE
                WHEN u.setor::text = ANY (ARRAY['2114'::text, '2214'::text, '2314'::text, '2414'::text, '2514'::text, '2614'::text]) THEN 'ADIDAS'::character varying
                WHEN u.setor::text = ANY (ARRAY['22714'::text, '22814'::text, '22914'::text]) THEN 'VEJA'::character varying
                WHEN u.setor::text = ANY (ARRAY['21314'::text, '21414'::text, '21514'::text, '21614'::text, '21714'::text, '21814'::text, '21914'::text]) THEN 'NEW BALANCE'::character varying
                ELSE 'NÃO REALIZADOS'::character varying
            END
            ELSE marc.nome
        END AS nome_marca,
    COALESCE(u.nome, t.nome_usuario_original::character varying) AS nome_usuario,
    uca.timestamp_criacao_usuario,
    u.turno,
    u.setor,
    u.ativo,
    t.total_perguntas,
    t.total_perguntas_conforme,
    t.total_perguntas_nao_conforme,
    t.total_categorias,
    t.total_categorias_conforme,
    t.total_categorias_nao_conforme,
    t.eh_ficticio
   FROM todos_checklists t
     LEFT JOIN modelo mod ON t.id_modelo_fk IS NOT NULL AND t.id_modelo_fk = mod.id OR t.id_modelo_fk IS NULL AND mod.nome::text = t.nome_modelo_original
     LEFT JOIN marcas marc ON
        CASE
            WHEN mod.marca::text ~ '^[0-9]+$'::text THEN mod.marca::integer
            ELSE NULL::integer
        END = marc.id
     LEFT JOIN usuarios u ON t.id_usuario IS NOT NULL AND t.id_usuario = u.id OR t.id_usuario IS NULL AND u.nome::text = t.nome_usuario_original
     LEFT JOIN usuarios_com_atividade uca ON t.id_usuario IS NOT NULL AND t.id_usuario = uca.id_usuario OR t.id_usuario IS NULL AND uca.nome_usuario_original = t.nome_usuario_original
  ORDER BY t.data_criacao DESC, t.nome_usuario_original, t.intervalo;

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."categorias_id_seq"
OWNED BY "public"."categorias"."id";
SELECT setval('"public"."categorias_id_seq"', 618, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."checklist_submissoes_id_seq"
OWNED BY "public"."formulario_submissoes"."id";
SELECT setval('"public"."checklist_submissoes_id_seq"', 1160, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
SELECT setval('"public"."dashboard_widgets_id_seq"', 86, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
SELECT setval('"public"."dashboards_id_seq"', 5, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."formulario_id_seq"
OWNED BY "public"."formulario"."id";
SELECT setval('"public"."formulario_id_seq"', 60082, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."marcas_id_seq"
OWNED BY "public"."marcas"."id";
SELECT setval('"public"."marcas_id_seq"', 5, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."modelo_id_seq"
OWNED BY "public"."modelo"."id";
SELECT setval('"public"."modelo_id_seq"', 37, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."perguntas_id_seq"
OWNED BY "public"."perguntas"."id";
SELECT setval('"public"."perguntas_id_seq"', 1729, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."usuarios_id_seq"
OWNED BY "public"."usuarios"."id";
SELECT setval('"public"."usuarios_id_seq"', 49, true);

-- ----------------------------
-- Uniques structure for table admin
-- ----------------------------
ALTER TABLE "public"."admin" ADD CONSTRAINT "usuarios_copy1_email_key" UNIQUE ("email");

-- ----------------------------
-- Primary Key structure for table admin
-- ----------------------------
ALTER TABLE "public"."admin" ADD CONSTRAINT "usuarios_copy1_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table categorias
-- ----------------------------
ALTER TABLE "public"."categorias" ADD CONSTRAINT "categorias_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table dashboard_widgets
-- ----------------------------
ALTER TABLE "public"."dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table dashboards
-- ----------------------------
ALTER TABLE "public"."dashboards" ADD CONSTRAINT "dashboards_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table formulario
-- ----------------------------
ALTER TABLE "public"."formulario" ADD CONSTRAINT "formulario_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table formulario_submissoes
-- ----------------------------
ALTER TABLE "public"."formulario_submissoes" ADD CONSTRAINT "checklist_submissoes_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table marcas
-- ----------------------------
ALTER TABLE "public"."marcas" ADD CONSTRAINT "marcas_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table modelo
-- ----------------------------
ALTER TABLE "public"."modelo" ADD CONSTRAINT "modelo_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table perguntas
-- ----------------------------
ALTER TABLE "public"."perguntas" ADD CONSTRAINT "perguntas_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table usuarios
-- ----------------------------
ALTER TABLE "public"."usuarios" ADD CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Foreign Keys structure for table categorias
-- ----------------------------
ALTER TABLE "public"."categorias" ADD CONSTRAINT "categorias_id_modelo_fkey" FOREIGN KEY ("id_modelo") REFERENCES "public"."modelo" ("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table dashboard_widgets
-- ----------------------------
ALTER TABLE "public"."dashboard_widgets" ADD CONSTRAINT "fk_widget_dashboard" FOREIGN KEY ("id_dashboard") REFERENCES "public"."dashboards" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table formulario
-- ----------------------------
ALTER TABLE "public"."formulario" ADD CONSTRAINT "fk_formulario_id_modelo_fk" FOREIGN KEY ("id_modelo_fk") REFERENCES "public"."modelo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."formulario" ADD CONSTRAINT "fk_formulario_id_usuario" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."formulario" ADD CONSTRAINT "formulario_id_formulario_fkey" FOREIGN KEY ("id_formulario") REFERENCES "public"."formulario_submissoes" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table perguntas
-- ----------------------------
ALTER TABLE "public"."perguntas" ADD CONSTRAINT "fk_perguntas_id_categoria" FOREIGN KEY ("id_categoria") REFERENCES "public"."categorias" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."perguntas" ADD CONSTRAINT "fk_perguntas_id_modelo" FOREIGN KEY ("id_modelo") REFERENCES "public"."modelo" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
