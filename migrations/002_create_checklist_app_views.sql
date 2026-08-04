BEGIN;

SET LOCAL search_path TO checklist_app, pg_catalog;

CREATE VIEW "checklist_app"."metricas_atualizadas_tableau_copy3" AS  WITH turnos_identificados AS (
         SELECT s.id AS id_formulario,
            COALESCE(( SELECT t_real.id
                   FROM turnos t_real
                  WHERE t_real.entrada_inicio <= t_real.entrada_fim AND s.data_envio::time without time zone >= t_real.entrada_inicio AND s.data_envio::time without time zone <= t_real.entrada_fim OR t_real.entrada_inicio > t_real.entrada_fim AND (s.data_envio::time without time zone >= t_real.entrada_inicio OR s.data_envio::time without time zone <= t_real.entrada_fim) OR t_real.intervalo_inicio <= t_real.intervalo_fim AND s.data_envio::time without time zone >= t_real.intervalo_inicio AND s.data_envio::time without time zone <= t_real.intervalo_fim OR t_real.intervalo_inicio > t_real.intervalo_fim AND (s.data_envio::time without time zone >= t_real.intervalo_inicio OR s.data_envio::time without time zone <= t_real.intervalo_fim)
                 LIMIT 1), u_aux.id_turno_fk) AS id_turno_valido
           FROM formulario_submissoes s
             JOIN usuarios u_aux ON s.id_usuario = u_aux.id
        ), respostas_classificadas AS (
         SELECT s.id AS id_formulario,
            s.data_envio AS data_criacao,
            s.id_modelo AS id_modelo_fk,
            m.nome AS nome_modelo_original,
            s.id_usuario,
            u_1.nome AS nome_usuario_original,
            cat.categoria AS nome_categoria,
            cat.ctq AS categoria_critica,
            p.pergunta AS nome_pergunta,
            cp.nome AS celula_auditada,
            marc.nome AS marca_auditada,
            setor.nome AS setor_auditado,
            uni.nome AS unidade_auditada,
            t.nome AS nome_turno,
            t.entrada_inicio,
            t.entrada_fim,
            t.intervalo_inicio,
            t.intervalo_fim,
            arr.obj ->> 'resposta'::text AS resposta,
            arr.obj ->> 'observacao'::text AS observacao_registro,
                CASE
                    WHEN lower(TRIM(BOTH FROM arr.obj ->> 'resposta'::text)) = ANY (ARRAY['conforme'::text, 'n/a'::text]) THEN 'conforme'::text
                    WHEN lower(TRIM(BOTH FROM arr.obj ->> 'resposta'::text)) = ANY (ARRAY['não conforme'::text, 'nao conforme'::text, 'não preenchido'::text, 'nao preenchido'::text]) THEN 'nao_conforme'::text
                    ELSE 'outro'::text
                END AS classificacao
           FROM formulario_submissoes s
             JOIN usuarios u_1 ON s.id_usuario = u_1.id
             JOIN modelo m ON s.id_modelo = m.id
             LEFT JOIN celulas_producao cp ON s.id_celula = cp.id
             LEFT JOIN marcas marc ON cp.id_marca_fk = marc.id
             LEFT JOIN setores setor ON cp.id_setor_fk = setor.id
             LEFT JOIN unidades uni ON u_1.id_unidade_fk = uni.id
             JOIN turnos_identificados ti ON s.id = ti.id_formulario
             LEFT JOIN turnos t ON ti.id_turno_valido = t.id
             CROSS JOIN LATERAL jsonb_array_elements(s.respostas) arr(obj)
             JOIN perguntas p ON ((arr.obj ->> 'id_pergunta'::text)::integer) = p.id
             JOIN categorias cat ON p.id_categoria = cat.id
          WHERE u_1.ativo = 1
        ), categorias_avaliadas_por_formulario AS (
         SELECT respostas_classificadas.id_formulario,
            respostas_classificadas.nome_categoria,
            respostas_classificadas.categoria_critica,
                CASE
                    WHEN sum(
                    CASE
                        WHEN respostas_classificadas.classificacao = 'nao_conforme'::text THEN 1
                        ELSE 0
                    END) > 0 THEN 0
                    ELSE 1
                END AS cat_conforme
           FROM respostas_classificadas
          GROUP BY respostas_classificadas.id_formulario, respostas_classificadas.nome_categoria, respostas_classificadas.categoria_critica
        ), perguntas_ctq_por_formulario AS (
         SELECT respostas_classificadas.id_formulario,
            sum(
                CASE
                    WHEN respostas_classificadas.classificacao = ANY (ARRAY['conforme'::text, 'n/a'::text]) THEN 1
                    ELSE 0
                END) AS perg_ctq_conformes,
            count(*) AS perg_ctq_total
           FROM respostas_classificadas
          WHERE respostas_classificadas.categoria_critica = true
          GROUP BY respostas_classificadas.id_formulario
        ), acuracia_checklists AS (
         SELECT c.id_formulario,
            round(sum(c.cat_conforme)::numeric / NULLIF(count(c.cat_conforme), 0)::numeric * 100::numeric, 2) AS acuracidade_cat_conforme,
            round((count(c.cat_conforme) - sum(c.cat_conforme))::numeric / NULLIF(count(c.cat_conforme), 0)::numeric * 100::numeric, 2) AS acuracidade_cat_nc,
            round(sum(
                CASE
                    WHEN c.categoria_critica = true THEN c.cat_conforme
                    ELSE 0
                END)::numeric / NULLIF(sum(
                CASE
                    WHEN c.categoria_critica = true THEN 1
                    ELSE 0
                END), 0)::numeric * 100::numeric, 2) AS acuracidade_cat_ctq_conforme,
            round(sum(
                CASE
                    WHEN c.categoria_critica = true THEN 1 - c.cat_conforme
                    ELSE 0
                END)::numeric / NULLIF(sum(
                CASE
                    WHEN c.categoria_critica = true THEN 1
                    ELSE 0
                END), 0)::numeric * 100::numeric, 2) AS acuracidade_cat_ctq_nc,
            round(max(p.perg_ctq_conformes)::numeric / NULLIF(max(p.perg_ctq_total), 0)::numeric * 100::numeric, 2) AS acuracidade_perg_ctq_conforme,
            round((max(p.perg_ctq_total) - max(p.perg_ctq_conformes))::numeric / NULLIF(max(p.perg_ctq_total), 0)::numeric * 100::numeric, 2) AS acuracidade_perg_ctq_nc
           FROM categorias_avaliadas_por_formulario c
             LEFT JOIN perguntas_ctq_por_formulario p ON c.id_formulario = p.id_formulario
          GROUP BY c.id_formulario
        ), agregado_formulario AS (
         SELECT rc.id_formulario,
            rc.data_criacao AS data_e_horario,
            rc.data_criacao::date AS data_criacao,
            EXTRACT(year FROM rc.data_criacao)::integer AS ano_criacao,
            rc.data_criacao::time without time zone AS hora_relatorio,
            rc.id_modelo_fk,
            rc.nome_modelo_original,
            rc.id_usuario,
            rc.nome_usuario_original,
            rc.celula_auditada,
            rc.marca_auditada,
            rc.setor_auditado,
            rc.unidade_auditada,
            rc.nome_turno,
                CASE
                    WHEN rc.entrada_inicio <= rc.entrada_fim AND rc.data_criacao::time without time zone >= rc.entrada_inicio AND rc.data_criacao::time without time zone <= rc.entrada_fim OR rc.entrada_inicio > rc.entrada_fim AND (rc.data_criacao::time without time zone >= rc.entrada_inicio OR rc.data_criacao::time without time zone <= rc.entrada_fim) THEN 'Entrada'::text
                    WHEN rc.intervalo_inicio <= rc.intervalo_fim AND rc.data_criacao::time without time zone >= rc.intervalo_inicio AND rc.data_criacao::time without time zone <= rc.intervalo_fim OR rc.intervalo_inicio > rc.intervalo_fim AND (rc.data_criacao::time without time zone >= rc.intervalo_inicio OR rc.data_criacao::time without time zone <= rc.intervalo_fim) THEN 'Após Intervalo'::text
                    ELSE 'Fora de Horário'::text
                END AS intervalo
           FROM respostas_classificadas rc
          GROUP BY rc.id_formulario, rc.data_criacao, rc.id_modelo_fk, rc.nome_modelo_original, rc.id_usuario, rc.nome_usuario_original, rc.celula_auditada, rc.marca_auditada, rc.setor_auditado, rc.unidade_auditada, rc.nome_turno, rc.entrada_inicio, rc.entrada_fim, rc.intervalo_inicio, rc.intervalo_fim
        ), dias_validos AS (
         SELECT DISTINCT agregado_formulario.data_criacao,
            agregado_formulario.ano_criacao
           FROM agregado_formulario
          WHERE EXTRACT(isodow FROM agregado_formulario.data_criacao) <= 5::numeric
        ), usuarios_com_atividade AS (
         SELECT p.id_usuario,
            p.nome_usuario_original,
            min(p.data_criacao) AS data_primeiro_checklist,
            min(p.data_e_horario) AS timestamp_criacao_usuario
           FROM agregado_formulario p
             JOIN usuarios u_1 ON p.id_usuario = u_1.id
          WHERE u_1.ativo = 1
          GROUP BY p.id_usuario, p.nome_usuario_original
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
            'Não Realizado (Fictício)'::text AS nome_modelo_original,
            e.id_usuario,
            e.nome_usuario_original,
            NULL::text AS celula_auditada,
            NULL::text AS marca_auditada,
            NULL::text AS setor_auditado,
            NULL::text AS unidade_auditada,
            NULL::text AS nome_turno,
            e.intervalo,
            true AS eh_ficticio
           FROM checklists_esperados e
             LEFT JOIN agregado_formulario r ON e.data_criacao = r.data_criacao AND e.id_usuario = r.id_usuario AND e.intervalo = r.intervalo
          WHERE r.data_criacao IS NULL
        ), uniao_checklists AS (
         SELECT agregado_formulario.id_formulario,
            agregado_formulario.data_e_horario,
            agregado_formulario.data_criacao,
            agregado_formulario.ano_criacao,
            agregado_formulario.hora_relatorio,
            agregado_formulario.id_modelo_fk,
            agregado_formulario.nome_modelo_original,
            agregado_formulario.id_usuario,
            agregado_formulario.nome_usuario_original,
            agregado_formulario.celula_auditada,
            agregado_formulario.marca_auditada,
            agregado_formulario.setor_auditado,
            agregado_formulario.unidade_auditada,
            agregado_formulario.nome_turno,
            agregado_formulario.intervalo,
            false AS eh_ficticio
           FROM agregado_formulario
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
            checklists_faltantes.celula_auditada,
            checklists_faltantes.marca_auditada,
            checklists_faltantes.setor_auditado,
            checklists_faltantes.unidade_auditada,
            checklists_faltantes.nome_turno,
            checklists_faltantes.intervalo,
            checklists_faltantes.eh_ficticio
           FROM checklists_faltantes
        ), uniao_expandida_com_perguntas AS (
         SELECT u_1.id_formulario,
            u_1.data_e_horario,
            u_1.data_criacao,
            u_1.ano_criacao,
            u_1.hora_relatorio,
            u_1.intervalo,
            u_1.id_modelo_fk,
            u_1.nome_modelo_original,
            u_1.id_usuario,
            u_1.nome_usuario_original,
            u_1.eh_ficticio,
            COALESCE(rc.nome_categoria, 'AUSÊNCIA DE DADOS'::character varying) AS nome_categoria,
            rc.categoria_critica,
            COALESCE(rc.nome_pergunta, 'Checklist não foi realizado no turno exigido'::text) AS nome_pergunta,
            COALESCE(rc.resposta, 'FALTANTE'::text) AS resposta_registrada,
            COALESCE(rc.classificacao, 'nao_conforme'::text) AS classificacao_pergunta,
            rc.observacao_registro,
            COALESCE(u_1.celula_auditada, rc.celula_auditada) AS celula_final,
            COALESCE(u_1.marca_auditada, rc.marca_auditada) AS marca_final,
            COALESCE(u_1.setor_auditado, rc.setor_auditado) AS setor_final,
            COALESCE(u_1.unidade_auditada, rc.unidade_auditada) AS unidade_final,
            COALESCE(u_1.nome_turno, rc.nome_turno) AS turno_final
           FROM uniao_checklists u_1
             LEFT JOIN respostas_classificadas rc ON u_1.id_formulario = rc.id_formulario AND u_1.eh_ficticio = false
        )
 SELECT ue.id_formulario,
    ue.data_e_horario,
    ue.data_criacao,
    ue.ano_criacao,
    ue.hora_relatorio,
    ue.intervalo,
    ue.eh_ficticio,
    COALESCE(mod.nome, ue.nome_modelo_original) AS nome_modelo,
    COALESCE(ue.unidade_final, un_user.nome, 'NÃO INFORMADA'::character varying) AS nome_unidade,
    COALESCE(ue.setor_final, s_user.nome, 'NÃO INFORMADO'::character varying) AS nome_setor,
    COALESCE(ue.marca_final, marc_user.nome, 'NÃO REALIZADOS'::character varying) AS nome_marca,
    upper(COALESCE(u.nome, ue.nome_usuario_original)::text) AS nome_usuario,
    uca.timestamp_criacao_usuario,
    COALESCE(ue.turno_final, t_user.nome) AS turno,
    COALESCE(ue.celula_final, cp_user.nome) AS celula_ou_setor,
    u.ativo AS usuario_ativo,
    ue.nome_categoria,
    ue.categoria_critica,
    ue.nome_pergunta,
    ue.resposta_registrada,
    ue.classificacao_pergunta,
    ue.observacao_registro,
    u.funcao AS funcao_usuario,
    u.nivelusuario AS nivel_usuario,
    COALESCE(ac.acuracidade_cat_conforme, 0.00) AS acuracidade_cat_conforme,
    COALESCE(ac.acuracidade_cat_nc,
        CASE
            WHEN ue.eh_ficticio THEN 100.00
            ELSE 0.00
        END) AS acuracidade_cat_nc,
    COALESCE(ac.acuracidade_cat_ctq_conforme, 0.00) AS acuracidade_cat_ctq_conforme,
    COALESCE(ac.acuracidade_cat_ctq_nc,
        CASE
            WHEN ue.eh_ficticio THEN 100.00
            ELSE 0.00
        END) AS acuracidade_cat_ctq_nc,
    COALESCE(ac.acuracidade_perg_ctq_conforme, 0.00) AS acuracidade_perg_ctq_conforme,
    COALESCE(ac.acuracidade_perg_ctq_nc,
        CASE
            WHEN ue.eh_ficticio THEN 100.00
            ELSE 0.00
        END) AS acuracidade_perg_ctq_nc
   FROM uniao_expandida_com_perguntas ue
     JOIN usuarios u ON ue.id_usuario = u.id AND u.ativo = 1
     LEFT JOIN modelo mod ON ue.id_modelo_fk = mod.id
     LEFT JOIN unidades un_user ON u.id_unidade_fk = un_user.id
     LEFT JOIN setores s_user ON u.id_setor_fk = s_user.id
     LEFT JOIN celulas_producao cp_user ON u.id_celula_fk = cp_user.id
     LEFT JOIN marcas marc_user ON cp_user.id_marca_fk = marc_user.id
     LEFT JOIN turnos t_user ON u.id_turno_fk = t_user.id
     LEFT JOIN usuarios_com_atividade uca ON ue.id_usuario = uca.id_usuario
     LEFT JOIN acuracia_checklists ac ON ue.id_formulario = ac.id_formulario
  ORDER BY ue.data_criacao DESC, ue.nome_usuario_original, ue.intervalo, ue.nome_categoria, ue.nome_pergunta;

-- ----------------------------
-- View structure for metricas_atualizadas_tableau_copy1
-- ----------------------------
CREATE VIEW "checklist_app"."metricas_atualizadas_tableau_copy1" AS  WITH respostas_classificadas AS (
         SELECT s.id AS id_formulario,
            s.data_envio AS data_criacao,
            s.id_modelo AS id_modelo_fk,
            m.nome AS nome_modelo_original,
            s.id_usuario,
            u_1.nome AS nome_usuario_original,
            cat.categoria AS nome_categoria,
            cat.ctq AS categoria_critica,
            p.pergunta AS nome_pergunta,
            cp.nome AS celula_auditada,
            marc.nome AS marca_auditada,
            setor.nome AS setor_auditado,
            uni.nome AS unidade_auditada,
            t.nome AS nome_turno,
            t.entrada_inicio,
            t.entrada_fim,
            t.intervalo_inicio,
            t.intervalo_fim,
            arr.obj ->> 'resposta'::text AS resposta,
            arr.obj ->> 'observacao'::text AS observacao_registro,
                CASE
                    WHEN lower(TRIM(BOTH FROM arr.obj ->> 'resposta'::text)) = ANY (ARRAY['conforme'::text, 'n/a'::text]) THEN 'conforme'::text
                    WHEN lower(TRIM(BOTH FROM arr.obj ->> 'resposta'::text)) = ANY (ARRAY['não conforme'::text, 'nao conforme'::text, 'não preenchido'::text, 'nao preenchido'::text]) THEN 'nao_conforme'::text
                    ELSE 'outro'::text
                END AS classificacao
           FROM formulario_submissoes s
             JOIN usuarios u_1 ON s.id_usuario = u_1.id
             JOIN modelo m ON s.id_modelo = m.id
             LEFT JOIN celulas_producao cp ON s.id_celula = cp.id
             LEFT JOIN marcas marc ON cp.id_marca_fk = marc.id
             LEFT JOIN setores setor ON cp.id_setor_fk = setor.id
             LEFT JOIN unidades uni ON u_1.id_unidade_fk = uni.id
             LEFT JOIN turnos t ON u_1.id_turno_fk = t.id
             CROSS JOIN LATERAL jsonb_array_elements(s.respostas) arr(obj)
             JOIN perguntas p ON ((arr.obj ->> 'id_pergunta'::text)::integer) = p.id
             JOIN categorias cat ON p.id_categoria = cat.id
          WHERE u_1.ativo = 1
        ), categorias_avaliadas_por_formulario AS (
         SELECT respostas_classificadas.id_formulario,
            respostas_classificadas.nome_categoria,
            respostas_classificadas.categoria_critica,
                CASE
                    WHEN sum(
                    CASE
                        WHEN respostas_classificadas.classificacao = 'nao_conforme'::text THEN 1
                        ELSE 0
                    END) > 0 THEN 0
                    ELSE 1
                END AS cat_conforme
           FROM respostas_classificadas
          GROUP BY respostas_classificadas.id_formulario, respostas_classificadas.nome_categoria, respostas_classificadas.categoria_critica
        ), perguntas_ctq_por_formulario AS (
         SELECT respostas_classificadas.id_formulario,
            sum(
                CASE
                    WHEN respostas_classificadas.classificacao = ANY (ARRAY['conforme'::text, 'n/a'::text]) THEN 1
                    ELSE 0
                END) AS perg_ctq_conformes,
            count(*) AS perg_ctq_total
           FROM respostas_classificadas
          WHERE respostas_classificadas.categoria_critica = true
          GROUP BY respostas_classificadas.id_formulario
        ), acuracia_checklists AS (
         SELECT c.id_formulario,
            round(sum(c.cat_conforme)::numeric / NULLIF(count(c.cat_conforme), 0)::numeric * 100::numeric, 2) AS acuracidade_cat_conforme,
            round((count(c.cat_conforme) - sum(c.cat_conforme))::numeric / NULLIF(count(c.cat_conforme), 0)::numeric * 100::numeric, 2) AS acuracidade_cat_nc,
            round(sum(
                CASE
                    WHEN c.categoria_critica = true THEN c.cat_conforme
                    ELSE 0
                END)::numeric / NULLIF(sum(
                CASE
                    WHEN c.categoria_critica = true THEN 1
                    ELSE 0
                END), 0)::numeric * 100::numeric, 2) AS acuracidade_cat_ctq_conforme,
            round(sum(
                CASE
                    WHEN c.categoria_critica = true THEN 1 - c.cat_conforme
                    ELSE 0
                END)::numeric / NULLIF(sum(
                CASE
                    WHEN c.categoria_critica = true THEN 1
                    ELSE 0
                END), 0)::numeric * 100::numeric, 2) AS acuracidade_cat_ctq_nc,
            round(max(p.perg_ctq_conformes)::numeric / NULLIF(max(p.perg_ctq_total), 0)::numeric * 100::numeric, 2) AS acuracidade_perg_ctq_conforme,
            round((max(p.perg_ctq_total) - max(p.perg_ctq_conformes))::numeric / NULLIF(max(p.perg_ctq_total), 0)::numeric * 100::numeric, 2) AS acuracidade_perg_ctq_nc
           FROM categorias_avaliadas_por_formulario c
             LEFT JOIN perguntas_ctq_por_formulario p ON c.id_formulario = p.id_formulario
          GROUP BY c.id_formulario
        ), agregado_formulario AS (
         SELECT rc.id_formulario,
            ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text) AS data_e_horario,
            ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::date AS data_criacao,
            EXTRACT(year FROM ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text))::integer AS ano_criacao,
            ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone AS hora_relatorio,
            rc.id_modelo_fk,
            rc.nome_modelo_original,
            rc.id_usuario,
            rc.nome_usuario_original,
            rc.celula_auditada,
            rc.marca_auditada,
            rc.setor_auditado,
            rc.unidade_auditada,
            rc.nome_turno,
                CASE
                    WHEN ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= rc.entrada_inicio AND ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= rc.entrada_fim THEN 'Entrada'::text
                    WHEN ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= rc.intervalo_inicio AND ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= rc.intervalo_fim THEN 'Após Intervalo'::text
                    ELSE 'Fora de Horário'::text
                END AS intervalo
           FROM respostas_classificadas rc
          GROUP BY rc.id_formulario, rc.data_criacao, rc.id_modelo_fk, rc.nome_modelo_original, rc.id_usuario, rc.nome_usuario_original, rc.celula_auditada, rc.marca_auditada, rc.setor_auditado, rc.unidade_auditada, rc.nome_turno, rc.entrada_inicio, rc.entrada_fim, rc.intervalo_inicio, rc.intervalo_fim
        ), dias_validos AS (
         SELECT DISTINCT agregado_formulario.data_criacao,
            agregado_formulario.ano_criacao
           FROM agregado_formulario
          WHERE EXTRACT(isodow FROM agregado_formulario.data_criacao) <= 5::numeric
        ), usuarios_com_atividade AS (
         SELECT p.id_usuario,
            p.nome_usuario_original,
            min(p.data_criacao) AS data_primeiro_checklist,
            min(p.data_e_horario) AS timestamp_criacao_usuario
           FROM agregado_formulario p
             JOIN usuarios u_1 ON p.id_usuario = u_1.id
          WHERE u_1.ativo = 1
          GROUP BY p.id_usuario, p.nome_usuario_original
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
            'Não Realizado (Fictício)'::text AS nome_modelo_original,
            e.id_usuario,
            e.nome_usuario_original,
            NULL::text AS celula_auditada,
            NULL::text AS marca_auditada,
            NULL::text AS setor_auditado,
            NULL::text AS unidade_auditada,
            NULL::text AS nome_turno,
            e.intervalo,
            true AS eh_ficticio
           FROM checklists_esperados e
             LEFT JOIN agregado_formulario r ON e.data_criacao = r.data_criacao AND e.id_usuario = r.id_usuario AND e.intervalo = r.intervalo
          WHERE r.data_criacao IS NULL
        ), uniao_checklists AS (
         SELECT agregado_formulario.id_formulario,
            agregado_formulario.data_e_horario,
            agregado_formulario.data_criacao,
            agregado_formulario.ano_criacao,
            agregado_formulario.hora_relatorio,
            agregado_formulario.id_modelo_fk,
            agregado_formulario.nome_modelo_original,
            agregado_formulario.id_usuario,
            agregado_formulario.nome_usuario_original,
            agregado_formulario.celula_auditada,
            agregado_formulario.marca_auditada,
            agregado_formulario.setor_auditado,
            agregado_formulario.unidade_auditada,
            agregado_formulario.nome_turno,
            agregado_formulario.intervalo,
            false AS eh_ficticio
           FROM agregado_formulario
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
            checklists_faltantes.celula_auditada,
            checklists_faltantes.marca_auditada,
            checklists_faltantes.setor_auditado,
            checklists_faltantes.unidade_auditada,
            checklists_faltantes.nome_turno,
            checklists_faltantes.intervalo,
            checklists_faltantes.eh_ficticio
           FROM checklists_faltantes
        ), uniao_expandida_com_perguntas AS (
         SELECT u_1.id_formulario,
            u_1.data_e_horario,
            u_1.data_criacao,
            u_1.ano_criacao,
            u_1.hora_relatorio,
            u_1.intervalo,
            u_1.id_modelo_fk,
            u_1.nome_modelo_original,
            u_1.id_usuario,
            u_1.nome_usuario_original,
            u_1.eh_ficticio,
            COALESCE(rc.nome_categoria, 'AUSÊNCIA DE DADOS'::character varying) AS nome_categoria,
            rc.categoria_critica,
            COALESCE(rc.nome_pergunta, 'Checklist não foi realizado no turno exigido'::text) AS nome_pergunta,
            COALESCE(rc.resposta, 'FALTANTE'::text) AS resposta_registrada,
            COALESCE(rc.classificacao, 'nao_conforme'::text) AS classificacao_pergunta,
            rc.observacao_registro,
            COALESCE(u_1.celula_auditada, rc.celula_auditada) AS celula_final,
            COALESCE(u_1.marca_auditada, rc.marca_auditada) AS marca_final,
            COALESCE(u_1.setor_auditado, rc.setor_auditado) AS setor_final,
            COALESCE(u_1.unidade_auditada, rc.unidade_auditada) AS unidade_final,
            COALESCE(u_1.nome_turno, rc.nome_turno) AS turno_final
           FROM uniao_checklists u_1
             LEFT JOIN respostas_classificadas rc ON u_1.id_formulario = rc.id_formulario AND u_1.eh_ficticio = false
        )
 SELECT ue.id_formulario,
    ue.data_e_horario,
    ue.data_criacao,
    ue.ano_criacao,
    ue.hora_relatorio,
    ue.intervalo,
    ue.eh_ficticio,
    COALESCE(mod.nome, ue.nome_modelo_original) AS nome_modelo,
    COALESCE(ue.unidade_final, un_user.nome, 'NÃO INFORMADA'::character varying) AS nome_unidade,
    COALESCE(ue.setor_final, s_user.nome, 'NÃO INFORMADO'::character varying) AS nome_setor,
    COALESCE(ue.marca_final, marc_user.nome, 'NÃO REALIZADOS'::character varying) AS nome_marca,
    upper(COALESCE(u.nome, ue.nome_usuario_original)::text) AS nome_usuario,
    uca.timestamp_criacao_usuario,
    COALESCE(ue.turno_final, t_user.nome) AS turno,
    COALESCE(ue.celula_final, cp_user.nome) AS celula_ou_setor,
    u.ativo AS usuario_ativo,
    ue.nome_categoria,
    ue.categoria_critica,
    ue.nome_pergunta,
    ue.resposta_registrada,
    ue.classificacao_pergunta,
    ue.observacao_registro,
    u.funcao AS funcao_usuario,
    u.nivelusuario AS nivel_usuario,
    COALESCE(ac.acuracidade_cat_conforme, 0.00) AS acuracidade_cat_conforme,
    COALESCE(ac.acuracidade_cat_nc,
        CASE
            WHEN ue.eh_ficticio THEN 100.00
            ELSE 0.00
        END) AS acuracidade_cat_nc,
    COALESCE(ac.acuracidade_cat_ctq_conforme, 0.00) AS acuracidade_cat_ctq_conforme,
    COALESCE(ac.acuracidade_cat_ctq_nc,
        CASE
            WHEN ue.eh_ficticio THEN 100.00
            ELSE 0.00
        END) AS acuracidade_cat_ctq_nc,
    COALESCE(ac.acuracidade_perg_ctq_conforme, 0.00) AS acuracidade_perg_ctq_conforme,
    COALESCE(ac.acuracidade_perg_ctq_nc,
        CASE
            WHEN ue.eh_ficticio THEN 100.00
            ELSE 0.00
        END) AS acuracidade_perg_ctq_nc
   FROM uniao_expandida_com_perguntas ue
     JOIN usuarios u ON ue.id_usuario = u.id AND u.ativo = 1
     LEFT JOIN modelo mod ON ue.id_modelo_fk = mod.id
     LEFT JOIN unidades un_user ON u.id_unidade_fk = un_user.id
     LEFT JOIN setores s_user ON u.id_setor_fk = s_user.id
     LEFT JOIN celulas_producao cp_user ON u.id_celula_fk = cp_user.id
     LEFT JOIN marcas marc_user ON cp_user.id_marca_fk = marc_user.id
     LEFT JOIN turnos t_user ON u.id_turno_fk = t_user.id
     LEFT JOIN usuarios_com_atividade uca ON ue.id_usuario = uca.id_usuario
     LEFT JOIN acuracia_checklists ac ON ue.id_formulario = ac.id_formulario
  ORDER BY ue.data_criacao DESC, ue.nome_usuario_original, ue.intervalo, ue.nome_categoria, ue.nome_pergunta;

-- ----------------------------
-- View structure for metricas_atualizadas_tableau2
-- ----------------------------
CREATE VIEW "checklist_app"."metricas_atualizadas_tableau2" AS  WITH respostas_classificadas AS (
         SELECT s.id AS id_formulario,
            s.data_envio AS data_criacao,
            s.id_modelo AS id_modelo_fk,
            m.nome AS nome_modelo_original,
            s.id_usuario,
            u_1.nome AS nome_usuario_original,
            cat.categoria AS nome_categoria,
            cat.ctq AS categoria_critica,
            p.pergunta AS nome_pergunta,
            cp.nome AS celula_auditada,
            marc.nome AS marca_auditada,
            setor.nome AS setor_auditado,
            uni.nome AS unidade_auditada,
            t.nome AS nome_turno,
            t.entrada_inicio,
            t.entrada_fim,
            t.intervalo_inicio,
            t.intervalo_fim,
            arr.obj ->> 'resposta'::text AS resposta,
            arr.obj ->> 'observacao'::text AS observacao_registro,
                CASE
                    WHEN lower(TRIM(BOTH FROM arr.obj ->> 'resposta'::text)) = ANY (ARRAY['conforme'::text, 'n/a'::text]) THEN 'conforme'::text
                    WHEN lower(TRIM(BOTH FROM arr.obj ->> 'resposta'::text)) = ANY (ARRAY['não conforme'::text, 'nao conforme'::text, 'não preenchido'::text, 'nao preenchido'::text]) THEN 'nao_conforme'::text
                    ELSE 'outro'::text
                END AS classificacao
           FROM formulario_submissoes s
             JOIN usuarios u_1 ON s.id_usuario = u_1.id
             JOIN modelo m ON s.id_modelo = m.id
             LEFT JOIN celulas_producao cp ON s.id_celula = cp.id
             LEFT JOIN marcas marc ON cp.id_marca_fk = marc.id
             LEFT JOIN setores setor ON cp.id_setor_fk = setor.id
             LEFT JOIN unidades uni ON u_1.id_unidade_fk = uni.id
             LEFT JOIN turnos t ON u_1.id_turno_fk = t.id
             CROSS JOIN LATERAL jsonb_array_elements(s.respostas) arr(obj)
             JOIN perguntas p ON ((arr.obj ->> 'id_pergunta'::text)::integer) = p.id
             JOIN categorias cat ON p.id_categoria = cat.id
          WHERE u_1.ativo = 1
        ), categorias_avaliadas_por_formulario AS (
         SELECT respostas_classificadas.id_formulario,
            respostas_classificadas.nome_categoria,
            respostas_classificadas.categoria_critica,
                CASE
                    WHEN sum(
                    CASE
                        WHEN respostas_classificadas.classificacao = 'nao_conforme'::text THEN 1
                        ELSE 0
                    END) > 0 THEN 0
                    ELSE 1
                END AS cat_conforme
           FROM respostas_classificadas
          GROUP BY respostas_classificadas.id_formulario, respostas_classificadas.nome_categoria, respostas_classificadas.categoria_critica
        ), perguntas_ctq_por_formulario AS (
         SELECT respostas_classificadas.id_formulario,
            sum(
                CASE
                    WHEN respostas_classificadas.classificacao = ANY (ARRAY['conforme'::text, 'n/a'::text]) THEN 1
                    ELSE 0
                END) AS perg_ctq_conformes,
            count(*) AS perg_ctq_total
           FROM respostas_classificadas
          WHERE respostas_classificadas.categoria_critica = true
          GROUP BY respostas_classificadas.id_formulario
        ), acuracia_checklists AS (
         SELECT c.id_formulario,
            round(sum(c.cat_conforme)::numeric / NULLIF(count(c.cat_conforme), 0)::numeric * 100::numeric, 2) AS acuracidade_cat_conforme,
            round((count(c.cat_conforme) - sum(c.cat_conforme))::numeric / NULLIF(count(c.cat_conforme), 0)::numeric * 100::numeric, 2) AS acuracidade_cat_nc,
            round(sum(
                CASE
                    WHEN c.categoria_critica = true THEN c.cat_conforme
                    ELSE 0
                END)::numeric / NULLIF(sum(
                CASE
                    WHEN c.categoria_critica = true THEN 1
                    ELSE 0
                END), 0)::numeric * 100::numeric, 2) AS acuracidade_cat_ctq,
            round(max(p.perg_ctq_conformes)::numeric / NULLIF(max(p.perg_ctq_total), 0)::numeric * 100::numeric, 2) AS acuracidade_perg_ctq
           FROM categorias_avaliadas_por_formulario c
             LEFT JOIN perguntas_ctq_por_formulario p ON c.id_formulario = p.id_formulario
          GROUP BY c.id_formulario
        ), agregado_formulario AS (
         SELECT rc.id_formulario,
            ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text) AS data_e_horario,
            ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::date AS data_criacao,
            EXTRACT(year FROM ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text))::integer AS ano_criacao,
            ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone AS hora_relatorio,
            rc.id_modelo_fk,
            rc.nome_modelo_original,
            rc.id_usuario,
            rc.nome_usuario_original,
            rc.celula_auditada,
            rc.marca_auditada,
            rc.setor_auditado,
            rc.unidade_auditada,
            rc.nome_turno,
                CASE
                    WHEN ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= rc.entrada_inicio AND ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= rc.entrada_fim THEN 'Entrada'::text
                    WHEN ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone >= rc.intervalo_inicio AND ((rc.data_criacao AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)::time without time zone <= rc.intervalo_fim THEN 'Após Intervalo'::text
                    ELSE 'Fora de Horário'::text
                END AS intervalo
           FROM respostas_classificadas rc
          GROUP BY rc.id_formulario, rc.data_criacao, rc.id_modelo_fk, rc.nome_modelo_original, rc.id_usuario, rc.nome_usuario_original, rc.celula_auditada, rc.marca_auditada, rc.setor_auditado, rc.unidade_auditada, rc.nome_turno, rc.entrada_inicio, rc.entrada_fim, rc.intervalo_inicio, rc.intervalo_fim
        ), dias_validos AS (
         SELECT DISTINCT agregado_formulario.data_criacao,
            agregado_formulario.ano_criacao
           FROM agregado_formulario
          WHERE EXTRACT(isodow FROM agregado_formulario.data_criacao) <= 5::numeric
        ), usuarios_com_atividade AS (
         SELECT p.id_usuario,
            p.nome_usuario_original,
            min(p.data_criacao) AS data_primeiro_checklist,
            min(p.data_e_horario) AS timestamp_criacao_usuario
           FROM agregado_formulario p
             JOIN usuarios u_1 ON p.id_usuario = u_1.id
          WHERE u_1.ativo = 1
          GROUP BY p.id_usuario, p.nome_usuario_original
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
            'Não Realizado (Fictício)'::text AS nome_modelo_original,
            e.id_usuario,
            e.nome_usuario_original,
            NULL::text AS celula_auditada,
            NULL::text AS marca_auditada,
            NULL::text AS setor_auditado,
            NULL::text AS unidade_auditada,
            NULL::text AS nome_turno,
            e.intervalo,
            true AS eh_ficticio
           FROM checklists_esperados e
             LEFT JOIN agregado_formulario r ON e.data_criacao = r.data_criacao AND e.id_usuario = r.id_usuario AND e.intervalo = r.intervalo
          WHERE r.data_criacao IS NULL
        ), uniao_checklists AS (
         SELECT agregado_formulario.id_formulario,
            agregado_formulario.data_e_horario,
            agregado_formulario.data_criacao,
            agregado_formulario.ano_criacao,
            agregado_formulario.hora_relatorio,
            agregado_formulario.id_modelo_fk,
            agregado_formulario.nome_modelo_original,
            agregado_formulario.id_usuario,
            agregado_formulario.nome_usuario_original,
            agregado_formulario.celula_auditada,
            agregado_formulario.marca_auditada,
            agregado_formulario.setor_auditado,
            agregado_formulario.unidade_auditada,
            agregado_formulario.nome_turno,
            agregado_formulario.intervalo,
            false AS eh_ficticio
           FROM agregado_formulario
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
            checklists_faltantes.celula_auditada,
            checklists_faltantes.marca_auditada,
            checklists_faltantes.setor_auditado,
            checklists_faltantes.unidade_auditada,
            checklists_faltantes.nome_turno,
            checklists_faltantes.intervalo,
            checklists_faltantes.eh_ficticio
           FROM checklists_faltantes
        ), uniao_expandida_com_perguntas AS (
         SELECT u_1.id_formulario,
            u_1.data_e_horario,
            u_1.data_criacao,
            u_1.ano_criacao,
            u_1.hora_relatorio,
            u_1.intervalo,
            u_1.id_modelo_fk,
            u_1.nome_modelo_original,
            u_1.id_usuario,
            u_1.nome_usuario_original,
            u_1.eh_ficticio,
            COALESCE(rc.nome_categoria, 'AUSÊNCIA DE DADOS'::character varying) AS nome_categoria,
            rc.categoria_critica,
            COALESCE(rc.nome_pergunta, 'Checklist não foi realizado no turno exigido'::text) AS nome_pergunta,
            COALESCE(rc.resposta, 'FALTANTE'::text) AS resposta_registrada,
            COALESCE(rc.classificacao, 'nao_conforme'::text) AS classificacao_pergunta,
            rc.observacao_registro,
            COALESCE(u_1.celula_auditada, rc.celula_auditada) AS celula_final,
            COALESCE(u_1.marca_auditada, rc.marca_auditada) AS marca_final,
            COALESCE(u_1.setor_auditado, rc.setor_auditado) AS setor_final,
            COALESCE(u_1.unidade_auditada, rc.unidade_auditada) AS unidade_final,
            COALESCE(u_1.nome_turno, rc.nome_turno) AS turno_final
           FROM uniao_checklists u_1
             LEFT JOIN respostas_classificadas rc ON u_1.id_formulario = rc.id_formulario AND u_1.eh_ficticio = false
        )
 SELECT ue.id_formulario,
    ue.data_e_horario,
    ue.data_criacao,
    ue.ano_criacao,
    ue.hora_relatorio,
    ue.intervalo,
    ue.eh_ficticio,
    COALESCE(mod.nome, ue.nome_modelo_original) AS nome_modelo,
    COALESCE(ue.unidade_final, un_user.nome, 'NÃO INFORMADA'::character varying) AS nome_unidade,
    COALESCE(ue.setor_final, s_user.nome, 'NÃO INFORMADO'::character varying) AS nome_setor,
    COALESCE(ue.marca_final, marc_user.nome, 'NÃO REALIZADOS'::character varying) AS nome_marca,
    upper(COALESCE(u.nome, ue.nome_usuario_original)::text) AS nome_usuario,
    uca.timestamp_criacao_usuario,
    COALESCE(ue.turno_final, t_user.nome) AS turno,
    COALESCE(ue.celula_final, cp_user.nome) AS celula_ou_setor,
    u.ativo AS usuario_ativo,
    ue.nome_categoria,
    ue.categoria_critica,
    ue.nome_pergunta,
    ue.resposta_registrada,
    ue.classificacao_pergunta,
    ue.observacao_registro,
    u.nivelusuario AS nivel_usuario,
    COALESCE(ac.acuracidade_cat_conforme, 0.00) AS acuracidade_cat_conforme,
    COALESCE(ac.acuracidade_cat_nc,
        CASE
            WHEN ue.eh_ficticio THEN 100.00
            ELSE 0.00
        END) AS acuracidade_cat_nc,
    COALESCE(ac.acuracidade_cat_ctq, 0.00) AS acuracidade_cat_ctq,
    COALESCE(ac.acuracidade_perg_ctq, 0.00) AS acuracidade_perg_ctq
   FROM uniao_expandida_com_perguntas ue
     JOIN usuarios u ON ue.id_usuario = u.id AND u.ativo = 1
     LEFT JOIN modelo mod ON ue.id_modelo_fk = mod.id
     LEFT JOIN unidades un_user ON u.id_unidade_fk = un_user.id
     LEFT JOIN setores s_user ON u.id_setor_fk = s_user.id
     LEFT JOIN celulas_producao cp_user ON u.id_celula_fk = cp_user.id
     LEFT JOIN marcas marc_user ON cp_user.id_marca_fk = marc_user.id
     LEFT JOIN turnos t_user ON u.id_turno_fk = t_user.id
     LEFT JOIN usuarios_com_atividade uca ON ue.id_usuario = uca.id_usuario
     LEFT JOIN acuracia_checklists ac ON ue.id_formulario = ac.id_formulario
  ORDER BY ue.data_criacao DESC, ue.nome_usuario_original, ue.intervalo, ue.nome_categoria, ue.nome_pergunta;

-- ----------------------------
-- View structure for metricas_atualizadas_tableau
-- ----------------------------
CREATE VIEW "checklist_app"."metricas_atualizadas_tableau" AS  WITH turnos_identificados AS (
         SELECT s.id AS id_formulario,
            COALESCE(( SELECT t_real.id
                   FROM turnos t_real
                  WHERE t_real.entrada_inicio <= t_real.entrada_fim AND s.data_envio::time without time zone >= t_real.entrada_inicio AND s.data_envio::time without time zone <= t_real.entrada_fim OR t_real.entrada_inicio > t_real.entrada_fim AND (s.data_envio::time without time zone >= t_real.entrada_inicio OR s.data_envio::time without time zone <= t_real.entrada_fim) OR t_real.intervalo_inicio <= t_real.intervalo_fim AND s.data_envio::time without time zone >= t_real.intervalo_inicio AND s.data_envio::time without time zone <= t_real.intervalo_fim OR t_real.intervalo_inicio > t_real.intervalo_fim AND (s.data_envio::time without time zone >= t_real.intervalo_inicio OR s.data_envio::time without time zone <= t_real.intervalo_fim)
                 LIMIT 1), u_aux.id_turno_fk) AS id_turno_valido
           FROM formulario_submissoes s
             JOIN usuarios u_aux ON s.id_usuario = u_aux.id
        ), respostas_classificadas AS (
         SELECT s.id AS id_formulario,
            s.data_envio AS data_criacao,
            s.id_modelo AS id_modelo_fk,
            m.nome AS nome_modelo_original,
            s.id_usuario,
            u_1.nome AS nome_usuario_original,
            cat.categoria AS nome_categoria,
            cat.ctq AS categoria_critica,
            p.pergunta AS nome_pergunta,
            cp.nome AS celula_auditada,
            marc.nome AS marca_auditada,
            setor.nome AS setor_auditado,
            uni.nome AS unidade_auditada,
            t.nome AS nome_turno,
            t.entrada_inicio,
            t.entrada_fim,
            t.intervalo_inicio,
            t.intervalo_fim,
            arr.obj ->> 'resposta'::text AS resposta,
            arr.obj ->> 'observacao'::text AS observacao_registro,
                CASE
                    WHEN lower(TRIM(BOTH FROM arr.obj ->> 'resposta'::text)) = ANY (ARRAY['conforme'::text, 'n/a'::text]) THEN 'conforme'::text
                    WHEN lower(TRIM(BOTH FROM arr.obj ->> 'resposta'::text)) = ANY (ARRAY['não conforme'::text, 'nao conforme'::text, 'não preenchido'::text, 'nao preenchido'::text]) THEN 'nao_conforme'::text
                    ELSE 'outro'::text
                END AS classificacao
           FROM formulario_submissoes s
             JOIN usuarios u_1 ON s.id_usuario = u_1.id
             JOIN modelo m ON s.id_modelo = m.id
             LEFT JOIN celulas_producao cp ON s.id_celula = cp.id
             LEFT JOIN marcas marc ON cp.id_marca_fk = marc.id
             LEFT JOIN setores setor ON setor.id = COALESCE(s.id_setor, cp.id_setor_fk)
             LEFT JOIN unidades uni ON u_1.id_unidade_fk = uni.id
             JOIN turnos_identificados ti ON s.id = ti.id_formulario
             LEFT JOIN turnos t ON ti.id_turno_valido = t.id
             CROSS JOIN LATERAL jsonb_array_elements(s.respostas) arr(obj)
             JOIN perguntas p ON ((arr.obj ->> 'id_pergunta'::text)::integer) = p.id
             JOIN categorias cat ON p.id_categoria = cat.id
          WHERE u_1.ativo = 1
        ), categorias_avaliadas_por_formulario AS (
         SELECT respostas_classificadas.id_formulario,
            respostas_classificadas.nome_categoria,
            respostas_classificadas.categoria_critica,
                CASE
                    WHEN sum(
                    CASE
                        WHEN respostas_classificadas.classificacao = 'nao_conforme'::text THEN 1
                        ELSE 0
                    END) > 0 THEN 0
                    ELSE 1
                END AS cat_conforme
           FROM respostas_classificadas
          GROUP BY respostas_classificadas.id_formulario, respostas_classificadas.nome_categoria, respostas_classificadas.categoria_critica
        ), perguntas_ctq_por_formulario AS (
         SELECT respostas_classificadas.id_formulario,
            sum(
                CASE
                    WHEN respostas_classificadas.classificacao = ANY (ARRAY['conforme'::text, 'n/a'::text]) THEN 1
                    ELSE 0
                END) AS perg_ctq_conformes,
            count(*) AS perg_ctq_total
           FROM respostas_classificadas
          WHERE respostas_classificadas.categoria_critica = true
          GROUP BY respostas_classificadas.id_formulario
        ), acuracia_checklists AS (
         SELECT c.id_formulario,
            round(sum(c.cat_conforme)::numeric / NULLIF(count(c.cat_conforme), 0)::numeric * 100::numeric, 2) AS acuracidade_cat_conforme,
            round((count(c.cat_conforme) - sum(c.cat_conforme))::numeric / NULLIF(count(c.cat_conforme), 0)::numeric * 100::numeric, 2) AS acuracidade_cat_nc,
            round(sum(
                CASE
                    WHEN c.categoria_critica = true THEN c.cat_conforme
                    ELSE 0
                END)::numeric / NULLIF(sum(
                CASE
                    WHEN c.categoria_critica = true THEN 1
                    ELSE 0
                END), 0)::numeric * 100::numeric, 2) AS acuracidade_cat_ctq_conforme,
            round(sum(
                CASE
                    WHEN c.categoria_critica = true THEN 1 - c.cat_conforme
                    ELSE 0
                END)::numeric / NULLIF(sum(
                CASE
                    WHEN c.categoria_critica = true THEN 1
                    ELSE 0
                END), 0)::numeric * 100::numeric, 2) AS acuracidade_cat_ctq_nc,
            round(max(p.perg_ctq_conformes)::numeric / NULLIF(max(p.perg_ctq_total), 0)::numeric * 100::numeric, 2) AS acuracidade_perg_ctq_conforme,
            round((max(p.perg_ctq_total) - max(p.perg_ctq_conformes))::numeric / NULLIF(max(p.perg_ctq_total), 0)::numeric * 100::numeric, 2) AS acuracidade_perg_ctq_nc
           FROM categorias_avaliadas_por_formulario c
             LEFT JOIN perguntas_ctq_por_formulario p ON c.id_formulario = p.id_formulario
          GROUP BY c.id_formulario
        ), agregado_formulario AS (
         SELECT rc.id_formulario,
            rc.data_criacao AS data_e_horario,
            rc.data_criacao::date AS data_criacao,
            EXTRACT(year FROM rc.data_criacao)::integer AS ano_criacao,
            rc.data_criacao::time without time zone AS hora_relatorio,
            rc.id_modelo_fk,
            rc.nome_modelo_original,
            rc.id_usuario,
            rc.nome_usuario_original,
            rc.celula_auditada,
            rc.marca_auditada,
            rc.setor_auditado,
            rc.unidade_auditada,
            rc.nome_turno,
                CASE
                    WHEN rc.entrada_inicio <= rc.entrada_fim AND rc.data_criacao::time without time zone >= rc.entrada_inicio AND rc.data_criacao::time without time zone <= rc.entrada_fim OR rc.entrada_inicio > rc.entrada_fim AND (rc.data_criacao::time without time zone >= rc.entrada_inicio OR rc.data_criacao::time without time zone <= rc.entrada_fim) THEN 'Entrada'::text
                    WHEN rc.intervalo_inicio <= rc.intervalo_fim AND rc.data_criacao::time without time zone >= rc.intervalo_inicio AND rc.data_criacao::time without time zone <= rc.intervalo_fim OR rc.intervalo_inicio > rc.intervalo_fim AND (rc.data_criacao::time without time zone >= rc.intervalo_inicio OR rc.data_criacao::time without time zone <= rc.intervalo_fim) THEN 'Após Intervalo'::text
                    ELSE 'Fora de Horário'::text
                END AS intervalo
           FROM respostas_classificadas rc
          GROUP BY rc.id_formulario, rc.data_criacao, rc.id_modelo_fk, rc.nome_modelo_original, rc.id_usuario, rc.nome_usuario_original, rc.celula_auditada, rc.marca_auditada, rc.setor_auditado, rc.unidade_auditada, rc.nome_turno, rc.entrada_inicio, rc.entrada_fim, rc.intervalo_inicio, rc.intervalo_fim
        ), dias_validos AS (
         SELECT DISTINCT agregado_formulario.data_criacao,
            agregado_formulario.ano_criacao
           FROM agregado_formulario
          WHERE EXTRACT(isodow FROM agregado_formulario.data_criacao) <= 5::numeric
        ), usuarios_com_atividade AS (
         SELECT p.id_usuario,
            p.nome_usuario_original,
            min(p.data_criacao) AS data_primeiro_checklist,
            min(p.data_e_horario) AS timestamp_criacao_usuario
           FROM agregado_formulario p
             JOIN usuarios u_1 ON p.id_usuario = u_1.id
          WHERE u_1.ativo = 1
          GROUP BY p.id_usuario, p.nome_usuario_original
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
            'Não Realizado (Fictício)'::text AS nome_modelo_original,
            e.id_usuario,
            e.nome_usuario_original,
            NULL::text AS celula_auditada,
            NULL::text AS marca_auditada,
            NULL::text AS setor_auditado,
            NULL::text AS unidade_auditada,
            NULL::text AS nome_turno,
            e.intervalo,
            true AS eh_ficticio
           FROM checklists_esperados e
             LEFT JOIN agregado_formulario r ON e.data_criacao = r.data_criacao AND e.id_usuario = r.id_usuario AND e.intervalo = r.intervalo
          WHERE r.data_criacao IS NULL
        ), uniao_checklists AS (
         SELECT agregado_formulario.id_formulario,
            agregado_formulario.data_e_horario,
            agregado_formulario.data_criacao,
            agregado_formulario.ano_criacao,
            agregado_formulario.hora_relatorio,
            agregado_formulario.id_modelo_fk,
            agregado_formulario.nome_modelo_original,
            agregado_formulario.id_usuario,
            agregado_formulario.nome_usuario_original,
            agregado_formulario.celula_auditada,
            agregado_formulario.marca_auditada,
            agregado_formulario.setor_auditado,
            agregado_formulario.unidade_auditada,
            agregado_formulario.nome_turno,
            agregado_formulario.intervalo,
            false AS eh_ficticio
           FROM agregado_formulario
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
            checklists_faltantes.celula_auditada,
            checklists_faltantes.marca_auditada,
            checklists_faltantes.setor_auditado,
            checklists_faltantes.unidade_auditada,
            checklists_faltantes.nome_turno,
            checklists_faltantes.intervalo,
            checklists_faltantes.eh_ficticio
           FROM checklists_faltantes
        ), uniao_expandida_com_perguntas AS (
         SELECT u_1.id_formulario,
            u_1.data_e_horario,
            u_1.data_criacao,
            u_1.ano_criacao,
            u_1.hora_relatorio,
            u_1.intervalo,
            u_1.id_modelo_fk,
            u_1.nome_modelo_original,
            u_1.id_usuario,
            u_1.nome_usuario_original,
            u_1.eh_ficticio,
            COALESCE(rc.nome_categoria, 'AUSÊNCIA DE DADOS'::character varying) AS nome_categoria,
            rc.categoria_critica,
            COALESCE(rc.nome_pergunta, 'Checklist não foi realizado no turno exigido'::text) AS nome_pergunta,
            COALESCE(rc.resposta, 'FALTANTE'::text) AS resposta_registrada,
            COALESCE(rc.classificacao, 'nao_conforme'::text) AS classificacao_pergunta,
            rc.observacao_registro,
            COALESCE(u_1.celula_auditada, rc.celula_auditada) AS celula_final,
            COALESCE(u_1.marca_auditada, rc.marca_auditada) AS marca_final,
            COALESCE(u_1.setor_auditado, rc.setor_auditado) AS setor_final,
            COALESCE(u_1.unidade_auditada, rc.unidade_auditada) AS unidade_final,
            COALESCE(u_1.nome_turno, rc.nome_turno) AS turno_final
           FROM uniao_checklists u_1
             LEFT JOIN respostas_classificadas rc ON u_1.id_formulario = rc.id_formulario AND u_1.eh_ficticio = false
        )
 SELECT ue.id_formulario,
    ue.data_e_horario,
    ue.data_criacao,
    ue.ano_criacao,
    ue.hora_relatorio,
    ue.intervalo,
    ue.eh_ficticio,
    COALESCE(mod.nome, ue.nome_modelo_original) AS nome_modelo,
    COALESCE(ue.unidade_final, un_user.nome, 'NÃO INFORMADA'::character varying) AS nome_unidade,
    COALESCE(ue.setor_final, s_user.nome, 'NÃO INFORMADO'::character varying) AS nome_setor,
    COALESCE(ue.marca_final, marc_user.nome, 'NÃO REALIZADOS'::character varying) AS nome_marca,
    upper(COALESCE(u.nome, ue.nome_usuario_original)::text) AS nome_usuario,
    uca.timestamp_criacao_usuario,
    COALESCE(ue.turno_final, t_user.nome) AS turno,
    COALESCE(ue.celula_final, cp_user.nome) AS celula_ou_setor,
    u.ativo AS usuario_ativo,
    ue.nome_categoria,
    ue.categoria_critica,
    ue.nome_pergunta,
    ue.resposta_registrada,
    ue.classificacao_pergunta,
    ue.observacao_registro,
    u.funcao AS funcao_usuario,
    u.nivelusuario AS nivel_usuario,
    COALESCE(ac.acuracidade_cat_conforme, 0.00) AS acuracidade_cat_conforme,
    COALESCE(ac.acuracidade_cat_nc,
        CASE
            WHEN ue.eh_ficticio THEN 100.00
            ELSE 0.00
        END) AS acuracidade_cat_nc,
    COALESCE(ac.acuracidade_cat_ctq_conforme, 0.00) AS acuracidade_cat_ctq_conforme,
    COALESCE(ac.acuracidade_cat_ctq_nc,
        CASE
            WHEN ue.eh_ficticio THEN 100.00
            ELSE 0.00
        END) AS acuracidade_cat_ctq_nc,
    COALESCE(ac.acuracidade_perg_ctq_conforme, 0.00) AS acuracidade_perg_ctq_conforme,
    COALESCE(ac.acuracidade_perg_ctq_nc,
        CASE
            WHEN ue.eh_ficticio THEN 100.00
            ELSE 0.00
        END) AS acuracidade_perg_ctq_nc
   FROM uniao_expandida_com_perguntas ue
     JOIN usuarios u ON ue.id_usuario = u.id AND u.ativo = 1
     LEFT JOIN modelo mod ON ue.id_modelo_fk = mod.id
     LEFT JOIN unidades un_user ON u.id_unidade_fk = un_user.id
     LEFT JOIN setores s_user ON u.id_setor_fk = s_user.id
     LEFT JOIN celulas_producao cp_user ON u.id_celula_fk = cp_user.id
     LEFT JOIN marcas marc_user ON cp_user.id_marca_fk = marc_user.id
     LEFT JOIN turnos t_user ON u.id_turno_fk = t_user.id
     LEFT JOIN usuarios_com_atividade uca ON ue.id_usuario = uca.id_usuario
     LEFT JOIN acuracia_checklists ac ON ue.id_formulario = ac.id_formulario
  ORDER BY ue.data_criacao DESC, ue.nome_usuario_original, ue.intervalo, ue.nome_categoria, ue.nome_pergunta;

-- ----------------------------
-- View structure for nome_da_sua_view
-- ----------------------------
CREATE VIEW "checklist_app"."nome_da_sua_view" AS  WITH respostas_classificadas AS (
         SELECT s.id AS id_formulario,
            s.data_envio AS data_criacao,
            s.id_modelo AS id_modelo_fk,
            m.nome AS nome_modelo_original,
            s.id_usuario,
            u_1.nome AS nome_usuario_original,
            cat.categoria AS nome_categoria,
            cat.ctq AS categoria_critica,
            p.pergunta AS nome_pergunta,
            cp.nome AS celula_auditada,
            marc.nome AS marca_auditada,
            setor.nome AS setor_auditado,
            uni.nome AS unidade_auditada,
            t.nome AS nome_turno,
            t.entrada_inicio,
            t.entrada_fim,
            t.intervalo_inicio,
            t.intervalo_fim,
            arr.obj ->> 'resposta'::text AS resposta,
            arr.obj ->> 'observacao'::text AS observacao_registro,
                CASE
                    WHEN lower(TRIM(BOTH FROM arr.obj ->> 'resposta'::text)) = ANY (ARRAY['conforme'::text, 'n/a'::text]) THEN 'conforme'::text
                    WHEN lower(TRIM(BOTH FROM arr.obj ->> 'resposta'::text)) = ANY (ARRAY['não conforme'::text, 'nao conforme'::text, 'não preenchido'::text, 'nao preenchido'::text]) THEN 'nao_conforme'::text
                    ELSE 'outro'::text
                END AS classificacao
           FROM formulario_submissoes s
             JOIN usuarios u_1 ON s.id_usuario = u_1.id
             JOIN modelo m ON s.id_modelo = m.id
             LEFT JOIN celulas_producao cp ON s.id_celula = cp.id
             LEFT JOIN marcas marc ON cp.id_marca_fk = marc.id
             LEFT JOIN setores setor ON cp.id_setor_fk = setor.id
             LEFT JOIN unidades uni ON u_1.id_unidade_fk = uni.id
             LEFT JOIN turnos t ON u_1.id_turno_fk = t.id
             CROSS JOIN LATERAL jsonb_array_elements(s.respostas) arr(obj)
             JOIN perguntas p ON ((arr.obj ->> 'id_pergunta'::text)::integer) = p.id
             JOIN categorias cat ON p.id_categoria = cat.id
          WHERE u_1.ativo = 1
        ), categorias_avaliadas_por_formulario AS (
         SELECT respostas_classificadas.id_formulario,
            respostas_classificadas.nome_categoria,
            respostas_classificadas.categoria_critica,
                CASE
                    WHEN sum(
                    CASE
                        WHEN respostas_classificadas.classificacao = 'nao_conforme'::text THEN 1
                        ELSE 0
                    END) > 0 THEN 0
                    ELSE 1
                END AS cat_conforme
           FROM respostas_classificadas
          GROUP BY respostas_classificadas.id_formulario, respostas_classificadas.nome_categoria, respostas_classificadas.categoria_critica
        ), perguntas_ctq_por_formulario AS (
         SELECT respostas_classificadas.id_formulario,
            sum(
                CASE
                    WHEN respostas_classificadas.classificacao = ANY (ARRAY['conforme'::text, 'n/a'::text]) THEN 1
                    ELSE 0
                END) AS perg_ctq_conformes,
            count(*) AS perg_ctq_total
           FROM respostas_classificadas
          WHERE respostas_classificadas.categoria_critica = true
          GROUP BY respostas_classificadas.id_formulario
        ), acuracia_checklists AS (
         SELECT c.id_formulario,
            round(sum(c.cat_conforme)::numeric / NULLIF(count(c.cat_conforme), 0)::numeric * 100::numeric, 2) AS acuracidade_cat_conforme,
            round((count(c.cat_conforme) - sum(c.cat_conforme))::numeric / NULLIF(count(c.cat_conforme), 0)::numeric * 100::numeric, 2) AS acuracidade_cat_nc,
            round(sum(
                CASE
                    WHEN c.categoria_critica = true THEN c.cat_conforme
                    ELSE 0
                END)::numeric / NULLIF(sum(
                CASE
                    WHEN c.categoria_critica = true THEN 1
                    ELSE 0
                END), 0)::numeric * 100::numeric, 2) AS acuracidade_cat_ctq_conforme,
            round(sum(
                CASE
                    WHEN c.categoria_critica = true THEN 1 - c.cat_conforme
                    ELSE 0
                END)::numeric / NULLIF(sum(
                CASE
                    WHEN c.categoria_critica = true THEN 1
                    ELSE 0
                END), 0)::numeric * 100::numeric, 2) AS acuracidade_cat_ctq_nc,
            round(max(p.perg_ctq_conformes)::numeric / NULLIF(max(p.perg_ctq_total), 0)::numeric * 100::numeric, 2) AS acuracidade_perg_ctq_conforme,
            round((max(p.perg_ctq_total) - max(p.perg_ctq_conformes))::numeric / NULLIF(max(p.perg_ctq_total), 0)::numeric * 100::numeric, 2) AS acuracidade_perg_ctq_nc
           FROM categorias_avaliadas_por_formulario c
             LEFT JOIN perguntas_ctq_por_formulario p ON c.id_formulario = p.id_formulario
          GROUP BY c.id_formulario
        ), agregado_formulario AS (
         SELECT rc.id_formulario,
            rc.data_criacao AS data_e_horario,
            rc.data_criacao::date AS data_criacao,
            EXTRACT(year FROM rc.data_criacao)::integer AS ano_criacao,
            rc.data_criacao::time without time zone AS hora_relatorio,
            rc.id_modelo_fk,
            rc.nome_modelo_original,
            rc.id_usuario,
            rc.nome_usuario_original,
            rc.celula_auditada,
            rc.marca_auditada,
            rc.setor_auditado,
            rc.unidade_auditada,
            rc.nome_turno,
                CASE
                    WHEN rc.data_criacao::time without time zone >= rc.entrada_inicio AND rc.data_criacao::time without time zone <= rc.entrada_fim THEN 'Entrada'::text
                    WHEN rc.data_criacao::time without time zone >= rc.intervalo_inicio AND rc.data_criacao::time without time zone <= rc.intervalo_fim THEN 'Após Intervalo'::text
                    ELSE 'Fora de Horário'::text
                END AS intervalo
           FROM respostas_classificadas rc
          GROUP BY rc.id_formulario, rc.data_criacao, rc.id_modelo_fk, rc.nome_modelo_original, rc.id_usuario, rc.nome_usuario_original, rc.celula_auditada, rc.marca_auditada, rc.setor_auditado, rc.unidade_auditada, rc.nome_turno, rc.entrada_inicio, rc.entrada_fim, rc.intervalo_inicio, rc.intervalo_fim
        ), dias_validos AS (
         SELECT DISTINCT agregado_formulario.data_criacao,
            agregado_formulario.ano_criacao
           FROM agregado_formulario
          WHERE EXTRACT(isodow FROM agregado_formulario.data_criacao) <= 5::numeric
        ), usuarios_com_atividade AS (
         SELECT p.id_usuario,
            p.nome_usuario_original,
            min(p.data_criacao) AS data_primeiro_checklist,
            min(p.data_e_horario) AS timestamp_criacao_usuario
           FROM agregado_formulario p
             JOIN usuarios u_1 ON p.id_usuario = u_1.id
          WHERE u_1.ativo = 1
          GROUP BY p.id_usuario, p.nome_usuario_original
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
            'Não Realizado (Fictício)'::text AS nome_modelo_original,
            e.id_usuario,
            e.nome_usuario_original,
            NULL::text AS celula_auditada,
            NULL::text AS marca_auditada,
            NULL::text AS setor_auditado,
            NULL::text AS unidade_auditada,
            NULL::text AS nome_turno,
            e.intervalo,
            true AS eh_ficticio
           FROM checklists_esperados e
             LEFT JOIN agregado_formulario r ON e.data_criacao = r.data_criacao AND e.id_usuario = r.id_usuario AND e.intervalo = r.intervalo
          WHERE r.data_criacao IS NULL
        ), uniao_checklists AS (
         SELECT agregado_formulario.id_formulario,
            agregado_formulario.data_e_horario,
            agregado_formulario.data_criacao,
            agregado_formulario.ano_criacao,
            agregado_formulario.hora_relatorio,
            agregado_formulario.id_modelo_fk,
            agregado_formulario.nome_modelo_original,
            agregado_formulario.id_usuario,
            agregado_formulario.nome_usuario_original,
            agregado_formulario.celula_auditada,
            agregado_formulario.marca_auditada,
            agregado_formulario.setor_auditado,
            agregado_formulario.unidade_auditada,
            agregado_formulario.nome_turno,
            agregado_formulario.intervalo,
            false AS eh_ficticio
           FROM agregado_formulario
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
            checklists_faltantes.celula_auditada,
            checklists_faltantes.marca_auditada,
            checklists_faltantes.setor_auditado,
            checklists_faltantes.unidade_auditada,
            checklists_faltantes.nome_turno,
            checklists_faltantes.intervalo,
            checklists_faltantes.eh_ficticio
           FROM checklists_faltantes
        ), uniao_expandida_com_perguntas AS (
         SELECT u_1.id_formulario,
            u_1.data_e_horario,
            u_1.data_criacao,
            u_1.ano_criacao,
            u_1.hora_relatorio,
            u_1.intervalo,
            u_1.id_modelo_fk,
            u_1.nome_modelo_original,
            u_1.id_usuario,
            u_1.nome_usuario_original,
            u_1.eh_ficticio,
            COALESCE(rc.nome_categoria, 'AUSÊNCIA DE DADOS'::character varying) AS nome_categoria,
            rc.categoria_critica,
            COALESCE(rc.nome_pergunta, 'Checklist não foi realizado no turno exigido'::text) AS nome_pergunta,
            COALESCE(rc.resposta, 'FALTANTE'::text) AS resposta_registrada,
            COALESCE(rc.classificacao, 'nao_conforme'::text) AS classificacao_pergunta,
            rc.observacao_registro,
            COALESCE(u_1.celula_auditada, rc.celula_auditada) AS celula_final,
            COALESCE(u_1.marca_auditada, rc.marca_auditada) AS marca_final,
            COALESCE(u_1.setor_auditado, rc.setor_auditado) AS setor_final,
            COALESCE(u_1.unidade_auditada, rc.unidade_auditada) AS unidade_final,
            COALESCE(u_1.nome_turno, rc.nome_turno) AS turno_final
           FROM uniao_checklists u_1
             LEFT JOIN respostas_classificadas rc ON u_1.id_formulario = rc.id_formulario AND u_1.eh_ficticio = false
        )
 SELECT ue.id_formulario,
    ue.data_e_horario,
    ue.data_criacao,
    ue.ano_criacao,
    ue.hora_relatorio,
    ue.intervalo,
    ue.eh_ficticio,
    COALESCE(mod.nome, ue.nome_modelo_original) AS nome_modelo,
    COALESCE(ue.unidade_final, un_user.nome, 'NÃO INFORMADA'::character varying) AS nome_unidade,
    COALESCE(ue.setor_final, s_user.nome, 'NÃO INFORMADO'::character varying) AS nome_setor,
    COALESCE(ue.marca_final, marc_user.nome, 'NÃO REALIZADOS'::character varying) AS nome_marca,
    upper(COALESCE(u.nome, ue.nome_usuario_original)::text) AS nome_usuario,
    uca.timestamp_criacao_usuario,
    COALESCE(ue.turno_final, t_user.nome) AS turno,
    COALESCE(ue.celula_final, cp_user.nome) AS celula_ou_setor,
    u.ativo AS usuario_ativo,
    ue.nome_categoria,
    ue.categoria_critica,
    ue.nome_pergunta,
    ue.resposta_registrada,
    ue.classificacao_pergunta,
    ue.observacao_registro,
    u.funcao AS funcao_usuario,
    u.nivelusuario AS nivel_usuario,
    COALESCE(ac.acuracidade_cat_conforme, 0.00) AS acuracidade_cat_conforme,
    COALESCE(ac.acuracidade_cat_nc,
        CASE
            WHEN ue.eh_ficticio THEN 100.00
            ELSE 0.00
        END) AS acuracidade_cat_nc,
    COALESCE(ac.acuracidade_cat_ctq_conforme, 0.00) AS acuracidade_cat_ctq_conforme,
    COALESCE(ac.acuracidade_cat_ctq_nc,
        CASE
            WHEN ue.eh_ficticio THEN 100.00
            ELSE 0.00
        END) AS acuracidade_cat_ctq_nc,
    COALESCE(ac.acuracidade_perg_ctq_conforme, 0.00) AS acuracidade_perg_ctq_conforme,
    COALESCE(ac.acuracidade_perg_ctq_nc,
        CASE
            WHEN ue.eh_ficticio THEN 100.00
            ELSE 0.00
        END) AS acuracidade_perg_ctq_nc
   FROM uniao_expandida_com_perguntas ue
     JOIN usuarios u ON ue.id_usuario = u.id AND u.ativo = 1
     LEFT JOIN modelo mod ON ue.id_modelo_fk = mod.id
     LEFT JOIN unidades un_user ON u.id_unidade_fk = un_user.id
     LEFT JOIN setores s_user ON u.id_setor_fk = s_user.id
     LEFT JOIN celulas_producao cp_user ON u.id_celula_fk = cp_user.id
     LEFT JOIN marcas marc_user ON cp_user.id_marca_fk = marc_user.id
     LEFT JOIN turnos t_user ON u.id_turno_fk = t_user.id
     LEFT JOIN usuarios_com_atividade uca ON ue.id_usuario = uca.id_usuario
     LEFT JOIN acuracia_checklists ac ON ue.id_formulario = ac.id_formulario
  ORDER BY ue.data_criacao DESC, ue.nome_usuario_original, ue.intervalo, ue.nome_categoria, ue.nome_pergunta;

-- ----------------------------
-- View structure for nome_da_view_dependente
-- ----------------------------
CREATE VIEW "checklist_app"."nome_da_view_dependente" AS  SELECT nome_da_sua_view.id_formulario,
    nome_da_sua_view.data_e_horario,
    nome_da_sua_view.data_criacao,
    nome_da_sua_view.ano_criacao,
    nome_da_sua_view.hora_relatorio,
    nome_da_sua_view.intervalo,
    nome_da_sua_view.eh_ficticio,
    nome_da_sua_view.nome_modelo,
    nome_da_sua_view.nome_unidade,
    nome_da_sua_view.nome_setor,
    nome_da_sua_view.nome_marca,
    nome_da_sua_view.nome_usuario,
    nome_da_sua_view.timestamp_criacao_usuario,
    nome_da_sua_view.turno,
    nome_da_sua_view.celula_ou_setor,
    nome_da_sua_view.usuario_ativo,
    nome_da_sua_view.nome_categoria,
    nome_da_sua_view.categoria_critica,
    nome_da_sua_view.nome_pergunta,
    nome_da_sua_view.resposta_registrada,
    nome_da_sua_view.classificacao_pergunta,
    nome_da_sua_view.observacao_registro,
    nome_da_sua_view.funcao_usuario,
    nome_da_sua_view.nivel_usuario,
    nome_da_sua_view.acuracidade_cat_conforme,
    nome_da_sua_view.acuracidade_cat_nc,
    nome_da_sua_view.acuracidade_cat_ctq_conforme,
    nome_da_sua_view.acuracidade_cat_ctq_nc,
    nome_da_sua_view.acuracidade_perg_ctq_conforme,
    nome_da_sua_view.acuracidade_perg_ctq_nc
   FROM nome_da_sua_view;

-- ----------------------------
-- View structure for metricas_atualizadas_tableau_copy2
-- ----------------------------
CREATE VIEW "checklist_app"."metricas_atualizadas_tableau_copy2" AS  WITH respostas_classificadas AS (
         SELECT s.id AS id_formulario,
            s.data_envio AS data_criacao,
            s.id_modelo AS id_modelo_fk,
            m.nome AS nome_modelo_original,
            s.id_usuario,
            u_1.nome AS nome_usuario_original,
            cat.categoria AS nome_categoria,
            cat.ctq AS categoria_critica,
            p.pergunta AS nome_pergunta,
            cp.nome AS celula_auditada,
            marc.nome AS marca_auditada,
            setor.nome AS setor_auditado,
            uni.nome AS unidade_auditada,
            t.nome AS nome_turno,
            t.entrada_inicio,
            t.entrada_fim,
            t.intervalo_inicio,
            t.intervalo_fim,
            arr.obj ->> 'resposta'::text AS resposta,
            arr.obj ->> 'observacao'::text AS observacao_registro,
                CASE
                    WHEN lower(TRIM(BOTH FROM arr.obj ->> 'resposta'::text)) = ANY (ARRAY['conforme'::text, 'n/a'::text]) THEN 'conforme'::text
                    WHEN lower(TRIM(BOTH FROM arr.obj ->> 'resposta'::text)) = ANY (ARRAY['não conforme'::text, 'nao conforme'::text, 'não preenchido'::text, 'nao preenchido'::text]) THEN 'nao_conforme'::text
                    ELSE 'outro'::text
                END AS classificacao
           FROM formulario_submissoes s
             JOIN usuarios u_1 ON s.id_usuario = u_1.id
             JOIN modelo m ON s.id_modelo = m.id
             LEFT JOIN celulas_producao cp ON s.id_celula = cp.id
             LEFT JOIN marcas marc ON cp.id_marca_fk = marc.id
             LEFT JOIN setores setor ON cp.id_setor_fk = setor.id
             LEFT JOIN unidades uni ON u_1.id_unidade_fk = uni.id
             LEFT JOIN turnos t ON u_1.id_turno_fk = t.id
             CROSS JOIN LATERAL jsonb_array_elements(s.respostas) arr(obj)
             JOIN perguntas p ON ((arr.obj ->> 'id_pergunta'::text)::integer) = p.id
             JOIN categorias cat ON p.id_categoria = cat.id
          WHERE u_1.ativo = 1
        ), categorias_avaliadas_por_formulario AS (
         SELECT respostas_classificadas.id_formulario,
            respostas_classificadas.nome_categoria,
            respostas_classificadas.categoria_critica,
                CASE
                    WHEN sum(
                    CASE
                        WHEN respostas_classificadas.classificacao = 'nao_conforme'::text THEN 1
                        ELSE 0
                    END) > 0 THEN 0
                    ELSE 1
                END AS cat_conforme
           FROM respostas_classificadas
          GROUP BY respostas_classificadas.id_formulario, respostas_classificadas.nome_categoria, respostas_classificadas.categoria_critica
        ), perguntas_ctq_por_formulario AS (
         SELECT respostas_classificadas.id_formulario,
            sum(
                CASE
                    WHEN respostas_classificadas.classificacao = ANY (ARRAY['conforme'::text, 'n/a'::text]) THEN 1
                    ELSE 0
                END) AS perg_ctq_conformes,
            count(*) AS perg_ctq_total
           FROM respostas_classificadas
          WHERE respostas_classificadas.categoria_critica = true
          GROUP BY respostas_classificadas.id_formulario
        ), acuracia_checklists AS (
         SELECT c.id_formulario,
            round(sum(c.cat_conforme)::numeric / NULLIF(count(c.cat_conforme), 0)::numeric * 100::numeric, 2) AS acuracidade_cat_conforme,
            round((count(c.cat_conforme) - sum(c.cat_conforme))::numeric / NULLIF(count(c.cat_conforme), 0)::numeric * 100::numeric, 2) AS acuracidade_cat_nc,
            round(sum(
                CASE
                    WHEN c.categoria_critica = true THEN c.cat_conforme
                    ELSE 0
                END)::numeric / NULLIF(sum(
                CASE
                    WHEN c.categoria_critica = true THEN 1
                    ELSE 0
                END), 0)::numeric * 100::numeric, 2) AS acuracidade_cat_ctq_conforme,
            round(sum(
                CASE
                    WHEN c.categoria_critica = true THEN 1 - c.cat_conforme
                    ELSE 0
                END)::numeric / NULLIF(sum(
                CASE
                    WHEN c.categoria_critica = true THEN 1
                    ELSE 0
                END), 0)::numeric * 100::numeric, 2) AS acuracidade_cat_ctq_nc,
            round(max(p.perg_ctq_conformes)::numeric / NULLIF(max(p.perg_ctq_total), 0)::numeric * 100::numeric, 2) AS acuracidade_perg_ctq_conforme,
            round((max(p.perg_ctq_total) - max(p.perg_ctq_conformes))::numeric / NULLIF(max(p.perg_ctq_total), 0)::numeric * 100::numeric, 2) AS acuracidade_perg_ctq_nc
           FROM categorias_avaliadas_por_formulario c
             LEFT JOIN perguntas_ctq_por_formulario p ON c.id_formulario = p.id_formulario
          GROUP BY c.id_formulario
        ), agregado_formulario AS (
         SELECT rc.id_formulario,
            rc.data_criacao AS data_e_horario,
            rc.data_criacao::date AS data_criacao,
            EXTRACT(year FROM rc.data_criacao)::integer AS ano_criacao,
            rc.data_criacao::time without time zone AS hora_relatorio,
            rc.id_modelo_fk,
            rc.nome_modelo_original,
            rc.id_usuario,
            rc.nome_usuario_original,
            rc.celula_auditada,
            rc.marca_auditada,
            rc.setor_auditado,
            rc.unidade_auditada,
            rc.nome_turno,
                CASE
                    WHEN rc.entrada_inicio <= rc.entrada_fim AND rc.data_criacao::time without time zone >= rc.entrada_inicio AND rc.data_criacao::time without time zone <= rc.entrada_fim OR rc.entrada_inicio > rc.entrada_fim AND (rc.data_criacao::time without time zone >= rc.entrada_inicio OR rc.data_criacao::time without time zone <= rc.entrada_fim) THEN 'Entrada'::text
                    WHEN rc.intervalo_inicio <= rc.intervalo_fim AND rc.data_criacao::time without time zone >= rc.intervalo_inicio AND rc.data_criacao::time without time zone <= rc.intervalo_fim OR rc.intervalo_inicio > rc.intervalo_fim AND (rc.data_criacao::time without time zone >= rc.intervalo_inicio OR rc.data_criacao::time without time zone <= rc.intervalo_fim) THEN 'Após Intervalo'::text
                    ELSE 'Fora de Horário'::text
                END AS intervalo
           FROM respostas_classificadas rc
          GROUP BY rc.id_formulario, rc.data_criacao, rc.id_modelo_fk, rc.nome_modelo_original, rc.id_usuario, rc.nome_usuario_original, rc.celula_auditada, rc.marca_auditada, rc.setor_auditado, rc.unidade_auditada, rc.nome_turno, rc.entrada_inicio, rc.entrada_fim, rc.intervalo_inicio, rc.intervalo_fim
        ), dias_validos AS (
         SELECT DISTINCT agregado_formulario.data_criacao,
            agregado_formulario.ano_criacao
           FROM agregado_formulario
          WHERE EXTRACT(isodow FROM agregado_formulario.data_criacao) <= 5::numeric
        ), usuarios_com_atividade AS (
         SELECT p.id_usuario,
            p.nome_usuario_original,
            min(p.data_criacao) AS data_primeiro_checklist,
            min(p.data_e_horario) AS timestamp_criacao_usuario
           FROM agregado_formulario p
             JOIN usuarios u_1 ON p.id_usuario = u_1.id
          WHERE u_1.ativo = 1
          GROUP BY p.id_usuario, p.nome_usuario_original
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
            'Não Realizado (Fictício)'::text AS nome_modelo_original,
            e.id_usuario,
            e.nome_usuario_original,
            NULL::text AS celula_auditada,
            NULL::text AS marca_auditada,
            NULL::text AS setor_auditado,
            NULL::text AS unidade_auditada,
            NULL::text AS nome_turno,
            e.intervalo,
            true AS eh_ficticio
           FROM checklists_esperados e
             LEFT JOIN agregado_formulario r ON e.data_criacao = r.data_criacao AND e.id_usuario = r.id_usuario AND e.intervalo = r.intervalo
          WHERE r.data_criacao IS NULL
        ), uniao_checklists AS (
         SELECT agregado_formulario.id_formulario,
            agregado_formulario.data_e_horario,
            agregado_formulario.data_criacao,
            agregado_formulario.ano_criacao,
            agregado_formulario.hora_relatorio,
            agregado_formulario.id_modelo_fk,
            agregado_formulario.nome_modelo_original,
            agregado_formulario.id_usuario,
            agregado_formulario.nome_usuario_original,
            agregado_formulario.celula_auditada,
            agregado_formulario.marca_auditada,
            agregado_formulario.setor_auditado,
            agregado_formulario.unidade_auditada,
            agregado_formulario.nome_turno,
            agregado_formulario.intervalo,
            false AS eh_ficticio
           FROM agregado_formulario
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
            checklists_faltantes.celula_auditada,
            checklists_faltantes.marca_auditada,
            checklists_faltantes.setor_auditado,
            checklists_faltantes.unidade_auditada,
            checklists_faltantes.nome_turno,
            checklists_faltantes.intervalo,
            checklists_faltantes.eh_ficticio
           FROM checklists_faltantes
        ), uniao_expandida_com_perguntas AS (
         SELECT u_1.id_formulario,
            u_1.data_e_horario,
            u_1.data_criacao,
            u_1.ano_criacao,
            u_1.hora_relatorio,
            u_1.intervalo,
            u_1.id_modelo_fk,
            u_1.nome_modelo_original,
            u_1.id_usuario,
            u_1.nome_usuario_original,
            u_1.eh_ficticio,
            COALESCE(rc.nome_categoria, 'AUSÊNCIA DE DADOS'::character varying) AS nome_categoria,
            rc.categoria_critica,
            COALESCE(rc.nome_pergunta, 'Checklist não foi realizado no turno exigido'::text) AS nome_pergunta,
            COALESCE(rc.resposta, 'FALTANTE'::text) AS resposta_registrada,
            COALESCE(rc.classificacao, 'nao_conforme'::text) AS classificacao_pergunta,
            rc.observacao_registro,
            COALESCE(u_1.celula_auditada, rc.celula_auditada) AS celula_final,
            COALESCE(u_1.marca_auditada, rc.marca_auditada) AS marca_final,
            COALESCE(u_1.setor_auditado, rc.setor_auditado) AS setor_final,
            COALESCE(u_1.unidade_auditada, rc.unidade_auditada) AS unidade_final,
            COALESCE(u_1.nome_turno, rc.nome_turno) AS turno_final
           FROM uniao_checklists u_1
             LEFT JOIN respostas_classificadas rc ON u_1.id_formulario = rc.id_formulario AND u_1.eh_ficticio = false
        )
 SELECT ue.id_formulario,
    ue.data_e_horario,
    ue.data_criacao,
    ue.ano_criacao,
    ue.hora_relatorio,
    ue.intervalo,
    ue.eh_ficticio,
    COALESCE(mod.nome, ue.nome_modelo_original) AS nome_modelo,
    COALESCE(ue.unidade_final, un_user.nome, 'NÃO INFORMADA'::character varying) AS nome_unidade,
    COALESCE(ue.setor_final, s_user.nome, 'NÃO INFORMADO'::character varying) AS nome_setor,
    COALESCE(ue.marca_final, marc_user.nome, 'NÃO REALIZADOS'::character varying) AS nome_marca,
    upper(COALESCE(u.nome, ue.nome_usuario_original)::text) AS nome_usuario,
    uca.timestamp_criacao_usuario,
    COALESCE(ue.turno_final, t_user.nome) AS turno,
    COALESCE(ue.celula_final, cp_user.nome) AS celula_ou_setor,
    u.ativo AS usuario_ativo,
    ue.nome_categoria,
    ue.categoria_critica,
    ue.nome_pergunta,
    ue.resposta_registrada,
    ue.classificacao_pergunta,
    ue.observacao_registro,
    u.funcao AS funcao_usuario,
    u.nivelusuario AS nivel_usuario,
    COALESCE(ac.acuracidade_cat_conforme, 0.00) AS acuracidade_cat_conforme,
    COALESCE(ac.acuracidade_cat_nc,
        CASE
            WHEN ue.eh_ficticio THEN 100.00
            ELSE 0.00
        END) AS acuracidade_cat_nc,
    COALESCE(ac.acuracidade_cat_ctq_conforme, 0.00) AS acuracidade_cat_ctq_conforme,
    COALESCE(ac.acuracidade_cat_ctq_nc,
        CASE
            WHEN ue.eh_ficticio THEN 100.00
            ELSE 0.00
        END) AS acuracidade_cat_ctq_nc,
    COALESCE(ac.acuracidade_perg_ctq_conforme, 0.00) AS acuracidade_perg_ctq_conforme,
    COALESCE(ac.acuracidade_perg_ctq_nc,
        CASE
            WHEN ue.eh_ficticio THEN 100.00
            ELSE 0.00
        END) AS acuracidade_perg_ctq_nc
   FROM uniao_expandida_com_perguntas ue
     JOIN usuarios u ON ue.id_usuario = u.id AND u.ativo = 1
     LEFT JOIN modelo mod ON ue.id_modelo_fk = mod.id
     LEFT JOIN unidades un_user ON u.id_unidade_fk = un_user.id
     LEFT JOIN setores s_user ON u.id_setor_fk = s_user.id
     LEFT JOIN celulas_producao cp_user ON u.id_celula_fk = cp_user.id
     LEFT JOIN marcas marc_user ON cp_user.id_marca_fk = marc_user.id
     LEFT JOIN turnos t_user ON u.id_turno_fk = t_user.id
     LEFT JOIN usuarios_com_atividade uca ON ue.id_usuario = uca.id_usuario
     LEFT JOIN acuracia_checklists ac ON ue.id_formulario = ac.id_formulario
  ORDER BY ue.data_criacao DESC, ue.nome_usuario_original, ue.intervalo, ue.nome_categoria, ue.nome_pergunta;


COMMIT;
