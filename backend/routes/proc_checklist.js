const express = require('express');
const router = express.Router();
const pool = require('../db');
const autorizar = require('../middlewares/auth');
const { getIo } = require('../socket');

router.post('/salvar', async (req, res) => {
    const { nomeUsuario, assinatura, respostas, id_submissao, inicio_checklist, observacao } = req.body;

    if (!nomeUsuario || !assinatura || !Array.isArray(respostas) || respostas.length === 0) {
        return res.status(400).json({ sucesso: false, mensagem: 'Dados incompletos.' });
    }

    let currentIdFormulario = id_submissao;

    try {
        await pool.query('BEGIN');

        if (!currentIdFormulario) {
            const base64Data = assinatura.replace(/^data:image\/png;base64,/, "");
            const assinaturaBuffer = Buffer.from(base64Data, 'base64');

            const sqlSubmissao = 'INSERT INTO formulario_submissoes (assinatura, data_inicio) VALUES ($1, $2) RETURNING id';
            const resSubmissao = await pool.query(sqlSubmissao, [assinaturaBuffer, inicio_checklist]);
            currentIdFormulario = resSubmissao.rows[0].id;
        }

        const sqlResposta = `
            INSERT INTO formulario 
            (id_formulario, nome_usuario, nome_modelo, nome_categoria, nome_pergunta, nome_identificacao, resposta, foto, observacao) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;

        for (const resposta of respostas) {
            let fotoBuffer = null;
            if (resposta.foto) {
                const fotoBase64Data = resposta.foto.replace(/^data:image\/\w+;base64,/, "");
                fotoBuffer = Buffer.from(fotoBase64Data, 'base64');
            }

            const valores = [
                currentIdFormulario,
                nomeUsuario,
                resposta.modelo,
                resposta.categoria,
                resposta.pergunta,
                resposta.identificacao,
                resposta.resposta,
                fotoBuffer,
                resposta.observacao

            ];
            await pool.query(sqlResposta, valores);
        }

        await pool.query('COMMIT');

        emitirRankingAtualizado();

        res.status(201).json({ 
            sucesso: true, 
            mensagem: 'Checklist salvo com sucesso!', 
            id_formulario: currentIdFormulario 
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Erro na transação ao salvar checklist:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    } 
});

async function emitirRankingAtualizado() {
    const io = getIo();
    if (!io) {
        console.warn("Socket.io não inicializado, não é possível emitir ranking.");
        return;
    }
    try {
        const sql = `
            SELECT nome_modelo, COUNT(*) as total_nao_conforme
            FROM formulario
            WHERE resposta = 'Não Conforme'
            GROUP BY nome_modelo
            ORDER BY total_nao_conforme DESC
            LIMIT 5;
        `;
        const resultado = await pool.query(sql);
        const ranking = resultado.rows;

        console.log('Emitindo evento "atualizar-ranking" com os novos dados.');
        io.emit('atualizar-ranking', ranking);

    } catch (error) {
        console.error("Erro ao buscar e emitir ranking:", error);
    }
}

module.exports = router;