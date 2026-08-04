const express = require('express');
const router = express.Router();
// Ajuste o caminho do seu pool de conexão com o PostgreSQL
const pool = require('../db'); 

// ----------------------------------------------------------------------
// ROTA 1: Lista todas as Views (Fontes de Dados) disponíveis no banco
// ----------------------------------------------------------------------
router.get('/fontes', async (req, res) => {
  try {
    // Busca views que começam com 'vw_' ou 'metricas_'
    const query = `
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND (table_name LIKE 'vw_%' OR table_name LIKE 'metricas_%');
    `;
    const result = await pool.query(query);
    res.json({ sucesso: true, fontes: result.rows.map(r => r.table_name) });
  } catch (error) {
    console.error('Erro ao buscar fontes:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar fontes de dados.' });
  }
});

// ----------------------------------------------------------------------
// ROTA 2: Lista as colunas de uma View específica
// ----------------------------------------------------------------------
router.get('/colunas/:fonte', async (req, res) => {
  const { fonte } = req.params;
  try {
    const query = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1;
    `;
    const result = await pool.query(query, [fonte]);
    res.json({ sucesso: true, colunas: result.rows });
  } catch (error) {
    console.error('Erro ao buscar colunas:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar colunas.' });
  }
});

// ----------------------------------------------------------------------
// ROTA 3: Salva o Dashboard e seus Widgets (Gráficos) no banco
// ----------------------------------------------------------------------
router.post('/salvar', async (req, res) => {
  const { titulo, descricao, filtros, widgets } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // Inicia a transação

    const dashQuery = `INSERT INTO dashboards (titulo, descricao, filstros_globais) VALUES ($1, $2, $3) RETURNING id`;
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
    res.json({ sucesso: true, mensagem: 'Dashboard salvo!', id: idDashboard });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao salvar dash:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao salvar o dashboard.' });
  } finally {
    client.release();
  }
});

// ----------------------------------------------------------------------
// ROTA 4: O MOTOR DE EXTRAÇÃO DINÂMICA (BI Engine)
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// ROTA: Extrair dados da View aplicando Filtros Dinâmicos
// ----------------------------------------------------------------------
router.post('/extrair', async (req, res) => {
  const { fonte_dados, filtros } = req.body;

  if (!fonte_dados) {
    return res.status(400).json({ sucesso: false, mensagem: 'Fonte de dados não informada.' });
  }

  try {
    // 1. Iniciamos a query base
    let query = `SELECT * FROM "${fonte_dados}" WHERE 1=1`;
    const queryParams = [];
    let paramCount = 1;

    // 2. Se vieram filtros do Frontend, montamos o WHERE dinamicamente
    if (filtros && typeof filtros === 'object') {
      for (const [coluna, valor] of Object.entries(filtros)) {
        
        // Ignora chaves vazias, nulas ou "Todos"
        if (valor === '' || valor === null || valor === undefined) continue;

        // Trata os campos nativos de DATA
        // (Ajuste 'data_criacao' se a sua coluna de data principal tiver outro nome)
        if (coluna === 'dataInicio') {
          query += ` AND data_criacao >= $${paramCount}`;
          queryParams.push(valor);
          paramCount++;
        } 
        else if (coluna === 'dataFim') {
          // Adiciona 23:59:59 para incluir o dia inteiro na busca
          query += ` AND data_criacao <= $${paramCount}`;
          queryParams.push(`${valor} 23:59:59`);
          paramCount++;
        } 
        // Trata TODOS OS OUTROS FILTROS criados dinamicamente na tela (Ex: turno, modelo, marca)
        else {
          // Adiciona aspas duplas na coluna para evitar erros com nomes compostos ou maiúsculas no Postgres
          query += ` AND "${coluna}" = $${paramCount}`;
          queryParams.push(valor);
          paramCount++;
        }
      }
    }

    // Executa a query final (Ex: SELECT * FROM "metricas" WHERE 1=1 AND "turno" = $1 AND "data_criacao" >= $2)
    const result = await pool.query(query, queryParams);
    
    res.json({ sucesso: true, dados: result.rows });

  } catch (error) {
    console.error(`Erro ao extrair dados da view ${fonte_dados}:`, error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao processar os filtros.' });
  }
});

// ----------------------------------------------------------------------
// ROTA 5: Buscar a configuração de um Dashboard salvo para renderizar
// ----------------------------------------------------------------------
router.get('/carregar/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const dashRes = await pool.query('SELECT * FROM dashboards WHERE id = $1', [id]);
    if (dashRes.rows.length === 0) return res.status(404).json({ sucesso: false, mensagem: 'Não encontrado' });

    const widgetsRes = await pool.query('SELECT * FROM dashboard_widgets WHERE id_dashboard = $1 ORDER BY ordem ASC', [id]);
    
    res.json({ 
      sucesso: true, 
      dashboard: dashRes.rows[0],
      widgets: widgetsRes.rows 
    });
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro no servidor.' });
  }
});

// ----------------------------------------------------------------------
// ROTA: Listar todos os Dashboards criados
// ----------------------------------------------------------------------
router.get('/listar', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, titulo, data_criacao FROM dashboards ORDER BY data_criacao DESC');
    res.json({ sucesso: true, dashboards: result.rows });
  } catch (error) {
    console.error('Erro ao listar dashboards:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar.' });
  }
});

// ----------------------------------------------------------------------
// ROTA: Atualizar um Dashboard existente (Edição)
// ----------------------------------------------------------------------
router.put('/editar/:id', async (req, res) => {
  const { id } = req.params;
  const { titulo, descricao, filtros, widgets } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Atualiza os dados principais do Dashboard
    await client.query(
      `UPDATE dashboards SET titulo = $1, descricao = $2, filtros_globais = $3 WHERE id = $4`, 
      [titulo, descricao, JSON.stringify(filtros || []), id]
    );

    // 2. Apaga os widgets antigos deste dashboard
    await client.query(`DELETE FROM dashboard_widgets WHERE id_dashboard = $1`, [id]);

    // 3. Insere os widgets atualizados
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
    res.json({ sucesso: true, mensagem: 'Dashboard atualizado com sucesso!', id });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar dash:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar o dashboard.' });
  } finally {
    client.release();
  }
});

// ----------------------------------------------------------------------
// ROTA: Excluir um Dashboard
// ----------------------------------------------------------------------
router.delete('/excluir/:id', async (req, res) => {
  try {
    // Como a tabela dashboard_widgets tem ON DELETE CASCADE, 
    // deletar o dashboard apaga automaticamente os gráficos vinculados.
    await pool.query('DELETE FROM dashboards WHERE id = $1', [req.params.id]);
    res.json({ sucesso: true, mensagem: 'Dashboard excluído!' });
  } catch (error) {
    console.error('Erro ao excluir:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao excluir.' });
  }
});

module.exports = router;