// backend/routes/submissoes.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // Pool de conexões
// const autorizar = require('../middlewares/auth'); // REMOVIDO: Não será usado nas rotas públicas

const { calcularPontuacao, normalizarResposta } = require('../utils/scoring');

// Rota GET /api/submissoes/ (Listagem) - AGORA PÚBLICA
router.get('/', async (req, res) => { // REMOVIDO: autorizar(['usuario'])
    try {
        const sql = `
            SELECT DISTINCT ON (s.id)
       s.id, s.data_envio, fr.nome_usuario, fr.nome_modelo
FROM formulario_submissoes s
LEFT JOIN formulario fr ON s.id = fr.id_formulario
ORDER BY s.id DESC, s.data_envio DESC; -- << MUDANÇA AQUI
        `;
        const resultado = await db.query(sql);
        res.json({ sucesso: true, dados: resultado.rows });
    } catch (error) {
        console.error('Erro ao listar submissões:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    }
});

// Rota GET /api/submissoes/:id (Detalhes) - JÁ ESTAVA PÚBLICA
router.get('/:id', async (req, res) => { // JÁ ESTAVA SEM 'autorizar(['usuario'])'
    const { id } = req.params;
    const client = await db.connect();

    try {
        const headerQuery = `
            SELECT *
            FROM formulario_submissoes
            WHERE id = $1
        `;
        const headerRes = await client.query(headerQuery, [id]);
        if (headerRes.rows.length === 0) {
            client.release();
            return res.status(404).json({ sucesso: false, mensagem: 'Relatório não encontrado.' });
        }
        const header = headerRes.rows[0];

        const itemsQuery = `
            SELECT 
                nome_usuario, nome_modelo, nome_categoria, 
                nome_pergunta, resposta, foto, observacao
            FROM formulario
            WHERE id_formulario = $1
            ORDER BY id;
        `;
        const itemsRes = await client.query(itemsQuery, [id]);
        if (itemsRes.rows.length === 0) {
            console.warn(`Submissão ${id} encontrada, mas sem itens de formulário.`);
            return res.json({ 
                sucesso: true, 
                dados: {
                    id: header.id,
                    nomeUsuario: 'Desconhecido',
                    nomeModelo: 'Desconhecido',
                    dataEnvio: header.data_envio,
                    assinatura: header.assinatura 
                        ? `data:image/png;base64,${header.assinatura.toString('base64')}` 
                        : null,
                    categorias: {},
                    pontuacao: 100
                }
            });
        }

        const primeiroRegistro = itemsRes.rows[0];
        const dadosProcessados = {
            id: header.id,
            nomeUsuario: primeiroRegistro.nome_usuario,
            nomeModelo: primeiroRegistro.nome_modelo,
            dataEnvio: header.data_envio,
            assinatura: header.assinatura 
                ? `data:image/png;base64,${header.assinatura.toString('base64')}` 
                : null,
            categorias: {},
            pontuacao: 0
        };

        const dadosAgrupadosParaPontuar = {};

        itemsRes.rows.forEach(row => {
            if (!dadosProcessados.categorias[row.nome_categoria]) {
                dadosProcessados.categorias[row.nome_categoria] = [];
            }
            let fotoBase64 = null;
            if (row.foto) {
                fotoBase64 = `data:image/jpeg;base64,${row.foto.toString('base64')}`;
            }
            dadosProcessados.categorias[row.nome_categoria].push({
                pergunta: row.nome_pergunta,
                resposta: row.resposta,
                foto: fotoBase64,
                observacao: row.observacao
            });

            const respostaNormalizada = normalizarResposta(row.resposta);
            if (!dadosAgrupadosParaPontuar[row.nome_categoria]) {
                dadosAgrupadosParaPontuar[row.nome_categoria] = [];
            }
            dadosAgrupadosParaPontuar[row.nome_categoria].push(respostaNormalizada);
        });
        
        const { total_C, total_NC, total_NP, total_NA } = calcularPontuacao(dadosAgrupadosParaPontuar);

        const totalCategorias = total_C + total_NC + total_NP + total_NA;
        const totalCategoriasConformes = total_C + total_NA; 

        dadosProcessados.pontuacao = (totalCategorias > 0)
            ? Math.round((totalCategoriasConformes / totalCategorias) * 100)
            : 100;

        res.json({ sucesso: true, dados: dadosProcessados });

    } catch (error) {
        console.error('Erro ao buscar detalhes do relatório:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    } finally {
        client.release();
    }
});

module.exports = router;
