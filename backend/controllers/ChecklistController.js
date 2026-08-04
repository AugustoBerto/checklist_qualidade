const db = require('../db');
const { getIo } = require('../socket'); // Seu gerenciador de WebSockets

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

async function emitirRankingAtualizado() {
    const io = getIo();
    if (!io) return;
    try {
        const sql = `
            SELECT nome_modelo, COUNT(*) as total_nao_conforme
            FROM metricas_atualizadas_tableau
            WHERE classificacao_pergunta = 'nao_conforme' AND eh_ficticio = false
            GROUP BY nome_modelo
            ORDER BY total_nao_conforme DESC
            LIMIT 5;
        `;
        const resultado = await db.query(sql);
        io.emit('atualizar-ranking', resultado.rows);
    } catch (error) {
        console.error("Erro ao emitir ranking:", error);
    }
}

// ==========================================
// MÓDULO: CHECKLISTS
// ==========================================

exports.buscarPerguntas = async (req, res) => {
    const { modelo } = req.params;
    
    try {
        const { rows } = await db.query(`
            SELECT 
                p.id AS id_pergunta, 
                c.id AS id_categoria, 
                c.categoria, 
                c.ctq, 
                p.pergunta, 
                p.identificacao, 
                m.nome AS nome_modelo, 
                m.id AS id_modelo_fk
            FROM perguntas p
            JOIN modelo m ON p.id_modelo = m.id
            JOIN categorias c ON p.id_categoria = c.id
            WHERE p.id_modelo = $1
            ORDER BY c.id, p.id
        `, [modelo]);

        const agrupado = {};
        rows.forEach(row => {
            const catName = row.categoria || 'SEM CATEGORIA';
            if (!agrupado[catName]) agrupado[catName] = [];
            
            agrupado[catName].push({
                id: row.id_pergunta, 
                texto: row.pergunta,
                variavel: row.identificacao,
                modelo: row.nome_modelo,
                id_modelo: row.id_modelo_fk,
                ctq: row.ctq || false 
            });
        });

        res.status(200).json({ sucesso: true, respostasAgrupadas: agrupado });
        
    } catch (err) {
        console.error('Erro ao buscar perguntas:', err);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao buscar perguntas.' });
    }
};

exports.salvarChecklist = async (req, res) => {
    // 📌 RECEBENDO PAYLOAD OTIMIZADO (Agora também extraindo o id_setor)
    const { id_usuario, id_modelo, id_setor, id_celula, assinatura, respostas, inicio_checklist } = req.body;
    
    const idUsuarioFinal = id_usuario || (req.usuario ? req.usuario.id : null);

    if (!idUsuarioFinal || !id_modelo || !respostas || !Array.isArray(respostas) || respostas.length === 0) {
        return res.status(400).json({ sucesso: false, mensagem: 'Dados incompletos ou sem respostas.' });
    }

    const client = await db.connect();

    try {
        await client.query('BEGIN'); 

        // Processar assinatura Base64 para bytea
        let assinaturaBuffer = null;
        if (assinatura) {
            const base64Data = assinatura.replace(/^data:image\/\w+;base64,/, "");
            assinaturaBuffer = Buffer.from(base64Data, 'base64');
        }

        // 📌 INCLUSÃO DO ID_SETOR NO INSERT
        const sqlSubmissao = `
            INSERT INTO formulario_submissoes 
            (id_usuario, id_modelo, id_setor, id_celula, assinatura, respostas, inicio_checklist, data_envio) 
            VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, NOW()) 
            RETURNING id
        `;
        
        const resSubmissao = await client.query(sqlSubmissao, [
            idUsuarioFinal,
            id_modelo,
            id_setor || null,      // <--- SETOR SALVO AQUI
            id_celula || null, 
            assinaturaBuffer,
            JSON.stringify(respostas),
            inicio_checklist || null
        ]);
        
        const currentIdFormulario = resSubmissao.rows[0].id;

        await client.query('COMMIT'); 
        emitirRankingAtualizado();

        res.status(201).json({ 
            sucesso: true, 
            mensagem: 'Checklist salvo com velocidade Enterprise!', 
            id_relatorio: currentIdFormulario 
        });

    } catch (error) {
        await client.query('ROLLBACK'); 
        console.error('Erro ao salvar checklist via JSONB:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao salvar checklist.' });
    } finally {
        client.release(); 
    }
};