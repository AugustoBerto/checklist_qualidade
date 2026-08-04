const express = require('express');
const router = express.Router();
const pool = require('../db');
const { calcularPontuacao, normalizarResposta } = require('../utils/scoring');

// 1. Lista todos os usuários ativos
router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, nome, turno, setor FROM usuarios ORDER BY nome ASC'
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

    const dataConsulta = new Date().toISOString().slice(0, 10);
    const fusoHorario = 'America/Sao_Paulo';

    const queryTemplate = `
        SELECT nome_categoria, resposta, data_criacao, nome_modelo
        FROM formulario
        WHERE
            nome_usuario = $1
            AND (data_criacao AT TIME ZONE 'UTC') >= ($2::date AT TIME ZONE $3)
            AND (data_criacao AT TIME ZONE 'UTC') < (($2::date + INTERVAL '1 day') AT TIME ZONE $3)
    `;

    const queryEntrada = queryTemplate + `
        AND (
            (((data_criacao AT TIME ZONE 'UTC') AT TIME ZONE $3)::time >= '05:00:00'
            AND ((data_criacao AT TIME ZONE 'UTC') AT TIME ZONE $3)::time <= '09:55:00')
            OR
            (((data_criacao AT TIME ZONE 'UTC') AT TIME ZONE $3)::time >= '15:00:00'
            AND ((data_criacao AT TIME ZONE 'UTC') AT TIME ZONE $3)::time <= '20:10:00')
        )
    `;

    const queryVoltaIntervalo = queryTemplate + `
        AND NOT (
            (((data_criacao AT TIME ZONE 'UTC') AT TIME ZONE $3)::time >= '05:00:00'
            AND ((data_criacao AT TIME ZONE 'UTC') AT TIME ZONE $3)::time <= '09:55:00')
            OR
            (((data_criacao AT TIME ZONE 'UTC') AT TIME ZONE $3)::time >= '15:00:00'
            AND ((data_criacao AT TIME ZONE 'UTC') AT TIME ZONE $3)::time <= '20:10:00')
        )
    `;

    try {
        const [respostasEntrada, respostasVoltaIntervalo] = await Promise.all([
            pool.query(queryEntrada, [nomeUsuario, dataConsulta, fusoHorario]),
            pool.query(queryVoltaIntervalo, [nomeUsuario, dataConsulta, fusoHorario])
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
