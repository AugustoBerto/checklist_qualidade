const express = require('express');
const router = express.Router();
const pool = require('../db');
const { calcularPontuacao, normalizarResposta } = require('../utils/scoring');

router.get('/:id', async (req, res) => {
    const formularioId = parseInt(req.params.id, 10);
    if (isNaN(formularioId)) {
        return res.status(400).json({ sucesso: false, mensagem: 'ID inválido.' });
    }

    try {
        // 1. Buscar respostas do formulário
        const queryRespostas = `
            SELECT f.nome_usuario, f.nome_modelo, f.resposta, cs.data_envio, f.nome_categoria
            FROM formulario f
            LEFT JOIN formulario_submissoes cs ON f.id_formulario = cs.id
            WHERE f.id_formulario = $1
        `;
        const { rows: respostas } = await pool.query(queryRespostas, [formularioId]);

        if (respostas.length === 0) {
            return res.status(404).json({ sucesso: false, mensagem: 'Relatório não encontrado.' });
        }

        // 2. Agrupar respostas por categoria (strings normalizadas)
        const categorias = {};
        respostas.forEach(({ nome_categoria, resposta }) => {
            if (!categorias[nome_categoria]) {
                categorias[nome_categoria] = [];
            }
            categorias[nome_categoria].push(normalizarResposta(resposta));
        });

        // 3. Calcular totais
        const { total_C, total_NC, total_NP, total_NA } = calcularPontuacao(categorias);

        // 4. Montar array para gráfico igual ao formato desejado
        const dataset_source = [['status','total','cor']];
        if (total_C > 0) dataset_source.push(['Conforme', total_C, '#67C23A']);
        if (total_NC > 0) dataset_source.push(['Não Conforme', total_NC, '#F56C6C']);
        if (total_NP > 0) dataset_source.push(['Não Preenchido', total_NP, '#E6A23C']);
        if (total_NA > 0) dataset_source.push(['N/A', total_NA, '#909399']);

        // 5. Pegar informações do formulário
        const info = {
            nome_usuario: respostas[0]?.nome_usuario || '',
            nome_modelo: respostas[0]?.nome_modelo || '',
            data_envio: respostas[0]?.data_envio || null
        };

        // 6. Retornar JSON final no formato desejado
        res.json({
            sucesso: true,
            info,
            dadosGrafico: dataset_source
        });

    } catch (err) {
        console.error('Erro ao buscar dados do relatório:', err);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    }
});

module.exports = router;
