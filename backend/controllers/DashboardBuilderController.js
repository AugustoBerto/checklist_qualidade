const db = require('../db');

// ==========================================
// MÓDULO: CONSTRUTOR DE DASHBOARDS DINÂMICOS
// ==========================================

// 1. Lista as Views/Tabelas disponíveis para gerar gráficos
exports.listarFontesDeDados = async (req, res) => {
    try {
        const query = `
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'public' 
            AND (table_name LIKE 'vw_%' OR table_name LIKE 'metricas_%');
        `;
        const result = await db.query(query);
        res.status(200).json({ sucesso: true, fontes: result.rows.map(r => r.table_name) });
    } catch (error) {
        console.error('Erro ao buscar fontes de dados:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar fontes de dados.' });
    }
};

// 2. Lista as colunas de uma View específica
exports.listarColunasPorFonte = async (req, res) => {
    const { fonte } = req.params;
    try {
        const query = `
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = $1;
        `;
        const result = await db.query(query, [fonte]);
        res.status(200).json({ sucesso: true, colunas: result.rows });
    } catch (error) {
        console.error('Erro ao buscar colunas da fonte:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar colunas.' });
    }
};

// 3. Salva a configuração de um novo Dashboard e seus widgets
exports.salvarDashboard = async (req, res) => {
    const { titulo, descricao, filtros, widgets } = req.body;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // Note a correção do typo no nome da coluna (de filstros_globais para filtros_globais)
        const dashQuery = `INSERT INTO dashboards (titulo, descricao, filtros_globais) VALUES ($1, $2, $3) RETURNING id`;
        const dashResult = await client.query(dashQuery, [titulo, descricao, JSON.stringify(filtros || [])]);
        const idDashboard = dashResult.rows[0].id;

        if (widgets && widgets.length > 0) {
            const widgetQuery = `
                INSERT INTO dashboard_widgets 
                (id_dashboard, titulo, tipo_grafico, tamanho_coluna, fonte_dados, configuracao, ordem) 
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `;
            for (let i = 0; i < widgets.length; i++) {
                const w = widgets[i];
                await client.query(widgetQuery, [
                    idDashboard, w.titulo, w.tipo_grafico, w.tamanho_coluna, w.fonte_dados, w.configuracao, i
                ]);
            }
        }

        await client.query('COMMIT');
        res.status(201).json({ sucesso: true, mensagem: 'Dashboard salvo com sucesso!', id: idDashboard });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao salvar dashboard:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao salvar o dashboard.' });
    } finally {
        client.release();
    }
};

// 4. Edita a configuração de um Dashboard existente
exports.editarDashboard = async (req, res) => {
    const { id } = req.params;
    const { titulo, descricao, filtros, widgets } = req.body;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        await client.query(
            `UPDATE dashboards SET titulo = $1, descricao = $2, filtros_globais = $3 WHERE id = $4`, 
            [titulo, descricao, JSON.stringify(filtros || []), id]
        );

        await client.query(`DELETE FROM dashboard_widgets WHERE id_dashboard = $1`, [id]);

        if (widgets && widgets.length > 0) {
            const widgetQuery = `
                INSERT INTO dashboard_widgets 
                (id_dashboard, titulo, tipo_grafico, tamanho_coluna, fonte_dados, configuracao, ordem) 
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `;
            for (let i = 0; i < widgets.length; i++) {
                const w = widgets[i];
                await client.query(widgetQuery, [
                    id, w.titulo, w.tipo_grafico, w.tamanho_coluna, w.fonte_dados, w.configuracao, i
                ]);
            }
        }

        await client.query('COMMIT');
        res.status(200).json({ sucesso: true, mensagem: 'Dashboard atualizado com sucesso!', id });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao atualizar dashboard:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao atualizar o dashboard.' });
    } finally {
        client.release();
    }
};

// 5. Exclui um Dashboard
exports.excluirDashboard = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM dashboards WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ sucesso: false, mensagem: 'Dashboard não encontrado.' });
        }
        res.status(200).json({ sucesso: true, mensagem: 'Dashboard excluído com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir dashboard:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao excluir.' });
    }
};

// 6. Lista os Dashboards salvos
exports.listarDashboards = async (req, res) => {
    try {
        const result = await db.query('SELECT id, titulo, data_criacao FROM dashboards ORDER BY data_criacao DESC');
        res.status(200).json({ sucesso: true, dashboards: result.rows });
    } catch (error) {
        console.error('Erro ao listar dashboards:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar dashboards.' });
    }
};

// 7. Carrega a configuração completa de um Dashboard
exports.carregarDashboard = async (req, res) => {
    const { id } = req.params;
    try {
        const dashRes = await db.query('SELECT * FROM dashboards WHERE id = $1', [id]);
        if (dashRes.rows.length === 0) return res.status(404).json({ sucesso: false, mensagem: 'Dashboard não encontrado.' });

        const widgetsRes = await db.query('SELECT * FROM dashboard_widgets WHERE id_dashboard = $1 ORDER BY ordem ASC', [id]);
        
        res.status(200).json({ 
            sucesso: true, 
            dashboard: dashRes.rows[0],
            widgets: widgetsRes.rows 
        });
    } catch (error) {
        console.error('Erro ao carregar configuração do dashboard:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro no servidor ao carregar dashboard.' });
    }
};

// 8. O Motor de Extração Dinâmica (BI Engine)
exports.extrairDados = async (req, res) => {
    const { fonte_dados, filtros } = req.body;

    if (!fonte_dados) {
        return res.status(400).json({ sucesso: false, mensagem: 'Fonte de dados não informada.' });
    }

    try {
        // Validação básica de segurança: garante que a fonte de dados passada não contém caracteres maliciosos
        if (/[^a-zA-Z0-9_]/.test(fonte_dados)) {
            return res.status(400).json({ sucesso: false, mensagem: 'Nome da fonte de dados inválido.' });
        }

        let query = `SELECT * FROM "${fonte_dados}" WHERE 1=1`;
        const queryParams = [];
        let paramCount = 1;

        if (filtros && typeof filtros === 'object') {
            for (const [coluna, valor] of Object.entries(filtros)) {
                if (valor === '' || valor === null || valor === undefined) continue;
                
                // Validação de segurança no nome da coluna
                if (/[^a-zA-Z0-9_]/.test(coluna)) continue;

                if (coluna === 'dataInicio') {
                    query += ` AND data_criacao >= $${paramCount}`;
                    queryParams.push(valor);
                    paramCount++;
                } 
                else if (coluna === 'dataFim') {
                    query += ` AND data_criacao <= $${paramCount}`;
                    queryParams.push(`${valor} 23:59:59`);
                    paramCount++;
                } 
                else {
                    query += ` AND "${coluna}" = $${paramCount}`;
                    queryParams.push(valor);
                    paramCount++;
                }
            }
        }

        const result = await db.query(query, queryParams);
        res.status(200).json({ sucesso: true, dados: result.rows });

    } catch (error) {
        console.error(`Erro ao extrair dados dinâmicos da view ${fonte_dados}:`, error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao processar extração de dados.' });
    }
};