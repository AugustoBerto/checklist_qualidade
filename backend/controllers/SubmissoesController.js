const db = require('../db');
const { calcularPontuacao, normalizarResposta } = require('../utils/scoring');

// ==========================================
// MÓDULO: SUBMISSÕES (Painel de Consultas e Detalhes)
// ==========================================

// 1. Listar todas as submissões (Para a tabela principal)
exports.listarSubmissoes = async (req, res) => {
    try {
        // 📌 CORREÇÃO 1: Tudo alterado para LEFT JOIN. 
        // O COALESCE agora tenta buscar o nome do setor do modelo, da célula ou do usuário.
        const sql = `
            SELECT 
                s.id, 
                s.data_envio, 
                u.nome AS nome_usuario, 
                m.nome AS nome_modelo,
                cp.nome AS nome_celula,
                COALESCE(st_mod.nome, st_cp.nome, st_user.nome, 'Geral') as nome_setor
            FROM formulario_submissoes s
            JOIN usuarios u ON s.id_usuario = u.id
            JOIN modelo m ON s.id_modelo = m.id
            LEFT JOIN celulas_producao cp ON s.id_celula = cp.id
            LEFT JOIN setores st_cp ON cp.id_setor_fk = st_cp.id
            LEFT JOIN setores st_mod ON m.id_setor_fk = st_mod.id
            LEFT JOIN setores st_user ON u.id_setor_fk = st_user.id
            ORDER BY s.data_envio DESC;
        `;
        const resultado = await db.query(sql);
        res.status(200).json({ sucesso: true, dados: resultado.rows });
    } catch (error) {
        console.error('Erro ao listar submissões:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao listar submissões.' });
    }
};

// 2. Buscar detalhes completos de uma submissão (Inclui Fotos, Assinatura e Score)
exports.buscarDetalhesSubmissao = async (req, res) => {
    const { id } = req.params;
    const client = await db.connect();

    try {
        // 📌 CORREÇÃO 2: LEFT JOIN em perguntas e categorias.
        // Assim, se a pergunta foi apagada de um modelo editado, a resposta do inspetor ainda é mostrada.
        const queryDetalhes = `
            SELECT 
                s.id, 
                s.data_envio, 
                s.assinatura,
                u.nome AS nome_usuario, 
                m.nome AS nome_modelo,
                cp.nome AS nome_celula,
                (arr.obj ->> 'id_pergunta')::integer AS id_pergunta,
                arr.obj ->> 'resposta' AS resposta,
                arr.obj ->> 'foto' AS foto,
                arr.obj ->> 'observacao' AS observacao,
                COALESCE(p.pergunta, 'Item Removido/Descontinuado') AS nome_pergunta,
                COALESCE(c.categoria, 'Geral') AS nome_categoria
            FROM formulario_submissoes s
            JOIN usuarios u ON s.id_usuario = u.id
            JOIN modelo m ON s.id_modelo = m.id
            LEFT JOIN celulas_producao cp ON s.id_celula = cp.id
            CROSS JOIN LATERAL jsonb_array_elements(s.respostas) arr(obj)
            LEFT JOIN perguntas p ON (arr.obj ->> 'id_pergunta')::integer = p.id
            LEFT JOIN categorias c ON p.id_categoria = c.id
            WHERE s.id = $1
            ORDER BY c.id, p.id;
        `;
        
        const itemsRes = await client.query(queryDetalhes, [id]);

        if (itemsRes.rows.length === 0) {
            return res.status(404).json({ sucesso: false, mensagem: 'Relatório não encontrado ou sem itens preenchidos.' });
        }

        const primeiroRegistro = itemsRes.rows[0];
        
        const dadosProcessados = {
            id: primeiroRegistro.id,
            nomeUsuario: primeiroRegistro.nome_usuario,
            nomeModelo: primeiroRegistro.nome_modelo,
            nomeCelula: primeiroRegistro.nome_celula || 'Não informada',
            dataEnvio: primeiroRegistro.data_envio,
            assinatura: primeiroRegistro.assinatura ? `data:image/png;base64,${primeiroRegistro.assinatura.toString('base64')}` : null,
            categorias: {},
            pontuacao: 0
        };

        const dadosAgrupadosParaPontuar = {};

        itemsRes.rows.forEach(row => {
            // Garante que não quebra se a categoria voltar como nula
            const nomeCat = row.nome_categoria || 'Geral';

            if (!dadosProcessados.categorias[nomeCat]) {
                dadosProcessados.categorias[nomeCat] = [];
            }
            
            dadosProcessados.categorias[nomeCat].push({
                pergunta: row.nome_pergunta,
                resposta: row.resposta,
                foto: row.foto, 
                observacao: row.observacao
            });

            const respostaNormalizada = normalizarResposta(row.resposta);
            if (!dadosAgrupadosParaPontuar[nomeCat]) {
                dadosAgrupadosParaPontuar[nomeCat] = [];
            }
            dadosAgrupadosParaPontuar[nomeCat].push(respostaNormalizada);
        });
        
        const { total_C, total_NC, total_NP, total_NA } = calcularPontuacao(dadosAgrupadosParaPontuar);
        const totalCategorias = total_C + total_NC + total_NP + total_NA;
        const totalCategoriasConformes = total_C + total_NA; 

        dadosProcessados.pontuacao = (totalCategorias > 0)
            ? Math.round((totalCategoriasConformes / totalCategorias) * 100)
            : 100;

        res.status(200).json({ sucesso: true, dados: dadosProcessados });

    } catch (error) {
        console.error('Erro ao buscar detalhes da submissão:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao processar detalhes da consulta.' });
    } finally {
        client.release();
    }
};
