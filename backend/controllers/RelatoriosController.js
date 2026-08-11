const db = require('../db');
const { calcularPontuacao, normalizarResposta } = require('../utils/scoring');
// Relatório específico: dados de um checklist preenchido
exports.buscarRelatorioPorId = async (req, res) => {
    const submissaoId = parseInt(req.params.id, 10);
    
    if (isNaN(submissaoId)) {
        return res.status(400).json({ sucesso: false, mensagem: 'ID de relatório inválido.' });
    }

    try {
        // 📌 ATUALIZADO: Busca os dados direto da tabela de submissões e faz os JOINs necessários
        const queryRespostas = `
            SELECT 
                u.nome as nome_usuario, 
                m.nome as nome_modelo, 
                s.data_envio,
                cp.nome as nome_celula,
                st.nome as nome_setor,
                s.respostas -- Aqui está o nosso JSONB
            FROM formulario_submissoes s
            JOIN usuarios u ON s.id_usuario = u.id
            LEFT JOIN celulas_producao cp ON s.id_celula = cp.id
            LEFT JOIN setores st ON cp.id_setor_fk = st.id
            JOIN modelo m ON s.id_modelo = m.id
            WHERE s.id = $1
        `;
        const { rows } = await db.query(queryRespostas, [submissaoId]);

        if (rows.length === 0) {
            return res.status(404).json({ sucesso: false, mensagem: 'Relatório não encontrado.' });
        }

        const submissao = rows[0];
        const respostasJSON = submissao.respostas; // Este é o array de objetos do JSONB

        // Precisamos buscar os nomes das categorias para o scoring, pois o JSONB só tem o id_pergunta
        const queryCategorias = `
            SELECT p.id as id_pergunta, c.categoria as nome_categoria
            FROM perguntas p
            JOIN categorias c ON p.id_categoria = c.id
            WHERE p.id_modelo = (SELECT id_modelo FROM formulario_submissoes WHERE id = $1)
        `;
        const { rows: nomesCategorias } = await db.query(queryCategorias, [submissaoId]);
        
        // Criar um mapa de ID_PERGUNTA -> NOME_CATEGORIA
        const mapaCategorias = {};
        nomesCategorias.forEach(row => {
            mapaCategorias[row.id_pergunta] = row.nome_categoria;
        });

        // Agrupar respostas para o scoring
        const categoriasAgrupadas = {};
        respostasJSON.forEach(item => {
            const nomeCat = mapaCategorias[item.id_pergunta] || 'Geral';
            if (!categoriasAgrupadas[nomeCat]) {
                categoriasAgrupadas[nomeCat] = [];
            }
            categoriasAgrupadas[nomeCat].push(normalizarResposta(item.resposta));
        });

        // Calcular pontuação
        const { total_C, total_NC, total_NP, total_NA } = calcularPontuacao(categoriasAgrupadas);

        // Montar dataset para o gráfico
        const dataset_source = [['status', 'total', 'cor']];
        if (total_C > 0) dataset_source.push(['Conforme', total_C, '#67C23A']);
        if (total_NC > 0) dataset_source.push(['Não Conforme', total_NC, '#F56C6C']);
        if (total_NP > 0) dataset_source.push(['Não Preenchido', total_NP, '#E6A23C']);
        if (total_NA > 0) dataset_source.push(['N/A', total_NA, '#909399']);

        res.status(200).json({
            sucesso: true,
            info: {
                nome_usuario: submissao.nome_usuario,
                nome_modelo: submissao.nome_modelo,
                data_envio: submissao.data_envio,
                nome_setor: submissao.nome_setor,
                nome_celula: submissao.nome_celula,
            },
            dadosGrafico: dataset_source
        });

    } catch (err) {
        console.error('Erro ao buscar dados do relatório:', err);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao buscar relatório.' });
    }
};
