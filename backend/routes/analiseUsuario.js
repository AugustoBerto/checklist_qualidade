const express = require('express');
const router = express.Router();
const pool = require('../db');
const { calcularPontuacao, normalizarResposta } = require('../utils/scoring');
// Nova rota: análise de todos os usuários ativos
router.get('/analise-geral', async (req, res) => {
    const dataConsulta = new Date().toISOString().slice(0, 10);
    const fusoHorario = 'America/Sao_Paulo';
    const inicioTurno = '05:00:00';

    try {
        const { rows: usuariosAtivos } = await pool.query(
            'SELECT nome FROM usuarios WHERE ativo != 0'
        );
        if (usuariosAtivos.length === 0) return res.json([]);

        const nomesUsuarios = usuariosAtivos.map(u => u.nome);

        const query = `
            WITH dia_producao AS (
                SELECT
                    (($1::date + $3::time) AT TIME ZONE $2) as inicio,
                    (($1::date + INTERVAL '1 day' + $3::time) AT TIME ZONE $2) as fim
            )
            SELECT f.nome_usuario, f.nome_categoria, f.resposta, f.data_criacao, f.nome_modelo
            FROM formulario f, dia_producao dp
            WHERE f.nome_usuario = ANY($4)
              AND (f.data_criacao AT TIME ZONE 'UTC') >= dp.inicio
              AND (f.data_criacao AT TIME ZONE 'UTC') < dp.fim
        `;

        const { rows } = await pool.query(query, [dataConsulta, fusoHorario, inicioTurno, nomesUsuarios]);

        if (rows.length === 0) return res.json([]);

        const usuariosData = {};
        rows.forEach(resp => {
            const usuario = resp.nome_usuario;
            const resposta = normalizarResposta(resp.resposta);
            const categoria = resp.nome_categoria;

            if (!usuariosData[usuario]) {
                usuariosData[usuario] = { categorias: {}, modelo: resp.nome_modelo };
            }
            if (!usuariosData[usuario].categorias[categoria]) {
                usuariosData[usuario].categorias[categoria] = [];
            }
            usuariosData[usuario].categorias[categoria].push(resposta);
        });

        const resultado = Object.entries(usuariosData).map(([usuario, dados]) => {
            const totais = calcularPontuacao(dados.categorias);
            return {
                usuario,
                modelo_realizado: dados.modelo,
                conforme: totais.total_C,
                nao_conforme: totais.total_NC,
                nao_preenchido: totais.total_NP,
                na: totais.total_NA
            };
        });

        res.json(resultado);

    } catch (err) {
        res.status(500).json({ erro: 'Falha ao processar dados dos usuários: ' + err.message });
    }
});

// 1. Lista todos os usuários ativos
router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, nome, turno, setor FROM usuarios WHERE ativo !=0 ORDER BY nome ASC'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ erro: 'Falha ao buscar lista de usuários: ' + err.message });
    }
});
// 2. Análise detalhada por usuário (para o Dashboard)
router.get('/:id', async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    let nomeUsuario;

    try {
        const userResult = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ erro: 'Usuário não encontrado.' });
        }
        nomeUsuario = userResult.rows[0].nome;
    } catch (err) {
        return res.status(500).json({ erro: 'Falha ao buscar usuário: ' + err.message });
    }

    const dataConsulta = new Date().toISOString().slice(0, 10); // Ex: '2025-08-19'
    const fusoHorario = 'America/Sao_Paulo';
    const inicioTurno = '05:00:00'; // Define que o "dia de produção" começa às 5 da manhã

    // =================================================================================
    // MUDANÇA PRINCIPAL AQUI: Redefinindo o conceito de "dia"
    // Um "dia de produção" vai das 05:00 de hoje até as 04:59:59 de amanhã.
    // =================================================================================
    const queryTemplate = `
        WITH dia_producao AS (
            SELECT
                -- Início do dia de produção: 19/08/2025 05:00:00 (Horário de SP)
                (($2::date + $4::time) AT TIME ZONE $3) as inicio,
                -- Fim do dia de produção: 20/08/2025 05:00:00 (Horário de SP)
                (($2::date + INTERVAL '1 day' + $4::time) AT TIME ZONE $3) as fim
        )
        SELECT f.nome_categoria, f.resposta, f.data_criacao, f.nome_modelo
        FROM formulario f, dia_producao dp
        WHERE
            f.nome_usuario = $1
            AND (f.data_criacao AT TIME ZONE 'UTC') >= dp.inicio
            AND (f.data_criacao AT TIME ZONE 'UTC') < dp.fim
    `;

    const localTimeSnippet = `((data_criacao AT TIME ZONE 'UTC') AT TIME ZONE $3)::time`;

    const queryEntrada = queryTemplate + `
        AND (
            (${localTimeSnippet} >= '05:00:00' AND ${localTimeSnippet} <= '09:55:00')
            OR
            (${localTimeSnippet} >= '15:00:00' AND ${localTimeSnippet} <= '19:40:00')
        )
    `;

    const queryVoltaIntervalo = queryTemplate + `
        AND (
            (${localTimeSnippet} >= '11:05:00' AND ${localTimeSnippet} <= '14:59:00')
            OR
            (
                (${localTimeSnippet} >= '20:50:00' AND ${localTimeSnippet} <= '23:59:59')
                OR
                (${localTimeSnippet} >= '00:00:00' AND ${localTimeSnippet} <= '00:31:00')
            )
        )
    `;

    try {
        const [respostasEntrada, respostasVoltaIntervalo] = await Promise.all([
            // Adicionamos o parâmetro $4 (inicioTurno) nas queries
            pool.query(queryEntrada, [nomeUsuario, dataConsulta, fusoHorario, inicioTurno]),
            pool.query(queryVoltaIntervalo, [nomeUsuario, dataConsulta, fusoHorario, inicioTurno])
        ]);

        const montarGraficoPontuacao = (totais) => {
            const dados = [];
            if (totais.total_C > 0)
                dados.push({ value: totais.total_C, name: 'Conforme', itemStyle: { color: '#67C23A' } });
            if (totais.total_NC > 0)
                dados.push({ value: totais.total_NC, name: 'Não Conforme', itemStyle: { color: '#F56C6C' } });
            if (totais.total_NP > 0)
                dados.push({ value: totais.total_NP, name: 'Não Preenchido', itemStyle: { color: '#E6A23C' } });
            if (totais.total_NA > 0)
                dados.push({ value: totais.total_NA, name: 'N/A', itemStyle: { color: '#909399' } });
            return dados;
        };

        const processarPeriodo = (rows) => {
            if (rows.length === 0) return null;

            const categorias = {};
            rows.forEach(resp => {
                const resposta = normalizarResposta(resp.resposta);
                const categoria = resp.nome_categoria;
                if (!categorias[categoria]) {
                    categorias[categoria] = [];
                }
                categorias[categoria].push(resposta);
            });

            const totais = calcularPontuacao(categorias);
            return { dadosGraficoPontuacao: montarGraficoPontuacao(totais) };
        };

        const dadosEntrada = processarPeriodo(respostasEntrada.rows);
        const dadosVoltaIntervalo = processarPeriodo(respostasVoltaIntervalo.rows);
        const nomeModelo = respostasEntrada.rows[0]?.nome_modelo || respostasVoltaIntervalo.rows[0]?.nome_modelo || '';

        const respostaFinal = {
            entrada: dadosEntrada,
            volta_intervalo: dadosVoltaIntervalo,
            modelo_realizado: nomeModelo
        };

        res.json(respostaFinal);

    } catch (err) {
        res.status(500).json({ erro: 'Falha ao processar dados do usuário: ' + err.message });
    }
});




module.exports = router;
