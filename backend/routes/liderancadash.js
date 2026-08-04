// routes/dashboard.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // Seu pool de conexões do PostgreSQL

// GET /api/dashboard
router.get('/', async (req, res) => {
    try {
        // Consultas para os KPIs (Indicadores Chave de Performance)
        const totalSubmissoesQuery = db.query('SELECT COUNT(*) FROM formulario_submissoes');
        const totalUsuariosQuery = db.query('SELECT COUNT(*) FROM usuarios');
        const totalModelosQuery = db.query('SELECT COUNT(*) FROM modelo');

        // Consulta para o gráfico de pizza (status geral das categorias)
        const statusCategoriasQuery = db.query(`
            SELECT 
                CASE 
                    WHEN resposta = 'Conforme' OR resposta = 'N/A' THEN 'Conforme'
                    ELSE resposta 
                END as status_agrupado,
                COUNT(*) as total
            FROM formulario
            WHERE resposta IN ('Conforme', 'Não Conforme', 'Não Preenchido', 'N/A')
            GROUP BY status_agrupado;
        `);

        // Consulta para os checklists recentes
        const recentesQuery = db.query(`
            SELECT fr.id_formulario, fr.nome_usuario, fr.nome_modelo, fs.data_envio
            FROM formulario fr
            JOIN formulario_submissoes fs ON fr.id_formulario = fs.id
            GROUP BY fr.id_formulario, fr.nome_usuario, fr.nome_modelo, fs.data_envio
            ORDER BY fs.data_envio DESC
            LIMIT 5;
        `);

        // Consulta para o Top 3 Não Conformidades (já tínhamos)
        const top3Query = db.query(`
            SELECT nome_categoria, nome_pergunta, COUNT(*) as total_nao_conforme
            FROM formulario
            WHERE resposta = 'Não Conforme'
            GROUP BY nome_categoria, nome_pergunta
            ORDER BY total_nao_conforme DESC
            LIMIT 3;
        `);
        
        // Executa todas as consultas em paralelo
        const [
            totalSubmissoesRes,
            totalUsuariosRes,
            totalModelosRes,
            statusCategoriasRes,
            recentesRes,
            top3Res
        ] = await Promise.all([
            totalSubmissoesQuery,
            totalUsuariosQuery,
            totalModelosQuery,
            statusCategoriasQuery,
            recentesQuery,
            top3Query
        ]);

        // Monta o objeto de resposta final
        const dashboardData = {
            kpis: {
                totalSubmissoes: totalSubmissoesRes.rows[0].count,
                totalUsuarios: totalUsuariosRes.rows[0].count,
                totalModelos: totalModelosRes.rows[0].count,
            },
            statusGeral: statusCategoriasRes.rows,
            checklistsRecentes: recentesRes.rows,
            top3NaoConforme: top3Res.rows
        };

        res.json({ sucesso: true, dados: dashboardData });

    } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    }
});

module.exports = router;