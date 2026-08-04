const express = require('express');
const router = express.Router();
const db = require('../db'); // Seu pool de conexões do PostgreSQL
const autorizar = require('../middlewares/auth');

// Função para criar um identificador único (slug)
const slugify = (text) => {
    return text.toString().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/\s+/g, '_').replace(/[^\w-]+/g, '').replace(/--+/g, '_');
};

// Rota para criar um novo modelo completo: POST /api/modelos
router.post('/', autorizar(['admin']), async (req, res) => {
    const { nomeModelo, nomeMarca, categorias } = req.body;

    if (!nomeModelo || !categorias || Object.keys(categorias).length === 0) {
        return res.status(400).json({ sucesso: false, mensagem: 'Dados incompletos.' });
    }

    const client = await db.connect(); // Pega um cliente do pool para a transação

    try {
        await client.query('BEGIN'); // Inicia a transação

        // 1. Insere o modelo e pega o ID retornado (O campo 'ativo' entra como TRUE por default no banco)
        const sqlModelo = 'INSERT INTO modelo (nome, marca) VALUES ($1, $2) RETURNING id';
        const resModelo = await client.query(sqlModelo, [nomeModelo, nomeMarca]);
        const modeloId = resModelo.rows[0].id;

        // 2. Loop através das categorias recebidas
        for (const nomeCategoria in categorias) {
            const perguntas = categorias[nomeCategoria];

            // 3. Insere a categoria e pega o ID retornado
            const sqlCategoria = 'INSERT INTO categorias (categoria, id_modelo) VALUES ($1, $2) RETURNING id';
            const resCategoria = await client.query(sqlCategoria, [nomeCategoria, modeloId]);
            const categoriaId = resCategoria.rows[0].id;

            // 4. Loop através das perguntas da categoria
            for (const [index, textoPergunta] of perguntas.entries()) {
                // Gera o identificador único
                const identificacao = `${slugify(nomeCategoria)}_${index + 1}`;

                const sqlPergunta = 'INSERT INTO perguntas (pergunta, identificacao, id_categoria, id_modelo) VALUES ($1, $2, $3, $4)';
                await client.query(sqlPergunta, [textoPergunta, identificacao, categoriaId, modeloId]);
            }
        }

        await client.query('COMMIT'); // Confirma a transação
        res.status(201).json({ sucesso: true, mensagem: 'Modelo de checklist criado com sucesso!' });

    } catch (error) {
        await client.query('ROLLBACK'); // Desfaz tudo em caso de erro
        console.error('Erro ao criar modelo:', error);
        
        if (error.code === '23505') { // Código de erro para violação de unicidade
             return res.status(409).json({ sucesso: false, mensagem: `O modelo '${nomeModelo}' já existe.` });
        }
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    } finally {
        client.release(); // Libera o cliente de volta para o pool
    }
});

// Rota para buscar a lista de todos os modelos (para gestores verem todos, ativos ou não): GET /api/modelos
router.get('/', autorizar(['admin']), async (req, res) => {
    try {
        // Trazendo também o campo ativo para a listagem
        const result = await db.query('SELECT id, nome, ativo FROM modelo ORDER BY nome ASC');
        res.status(200).json({ sucesso: true, modelos: result.rows });
    } catch (error) {
        console.error('Erro ao buscar lista de modelos:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    }
});

// Rota para buscar um modelo específico para edição: GET /api/modelos/:id
router.get('/:id', autorizar(['admin']), async (req, res) => {
    const { id } = req.params;
    
    try {
        // Busca o modelo, agora incluindo o campo "ativo"
        const modeloResult = await db.query('SELECT id, nome, marca, ativo FROM modelo WHERE id = $1', [id]);
        
        if (modeloResult.rows.length === 0) {
            return res.status(404).json({ sucesso: false, mensagem: 'Modelo não encontrado.' });
        }

        const modelo = modeloResult.rows[0];

        // Busca as categorias e perguntas associadas
        const queryDetalhes = `
            SELECT c.categoria, p.pergunta 
            FROM categorias c
            LEFT JOIN perguntas p ON c.id = p.id_categoria
            WHERE c.id_modelo = $1
            ORDER BY c.id, p.id
        `;
        const detalhesResult = await db.query(queryDetalhes, [id]);

        // Formata os dados para o padrão que o frontend espera: { "Cat1": ["Perg1", "Perg2"] }
        const categoriasFormatadas = {};
        
        detalhesResult.rows.forEach(row => {
            if (!categoriasFormatadas[row.categoria]) {
                categoriasFormatadas[row.categoria] = [];
            }
            if (row.pergunta) {
                categoriasFormatadas[row.categoria].push(row.pergunta);
            }
        });

        res.status(200).json({
            sucesso: true,
            modelo: {
                id: modelo.id,
                nomeModelo: modelo.nome,
                nomeMarca: modelo.marca,
                ativo: modelo.ativo, // Retornando o status de ativo
                categorias: categoriasFormatadas
            }
        });

    } catch (error) {
        console.error('Erro ao buscar modelo:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    }
});

// Rota para atualizar um modelo: PUT /api/modelos/:id
router.put('/:id', autorizar(['admin']), async (req, res) => {
    const { id } = req.params;
    
    // Recebendo o campo ativo do frontend
    const { nomeModelo, nomeMarca, categorias, ativo } = req.body;

    if (!nomeModelo || !categorias || Object.keys(categorias).length === 0) {
        return res.status(400).json({ sucesso: false, mensagem: 'Dados incompletos.' });
    }

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // 1. Atualiza os dados principais do modelo, incluindo o status ATIVO
        await client.query(
            'UPDATE modelo SET nome = $1, marca = $2, ativo = $3 WHERE id = $4', 
            [nomeModelo, nomeMarca, ativo, id]
        );

        // 2. Remove as perguntas e categorias antigas
        await client.query('DELETE FROM perguntas WHERE id_modelo = $1', [id]);
        await client.query('DELETE FROM categorias WHERE id_modelo = $1', [id]);

        // 3. Recria as categorias e perguntas com os dados novos
        for (const nomeCategoria in categorias) {
            const perguntas = categorias[nomeCategoria];

            const resCategoria = await client.query(
                'INSERT INTO categorias (categoria, id_modelo) VALUES ($1, $2) RETURNING id', 
                [nomeCategoria, id]
            );
            const categoriaId = resCategoria.rows[0].id;

            for (const [index, textoPergunta] of perguntas.entries()) {
                const identificacao = `${slugify(nomeCategoria)}_${index + 1}`;
                await client.query(
                    'INSERT INTO perguntas (pergunta, identificacao, id_categoria, id_modelo) VALUES ($1, $2, $3, $4)', 
                    [textoPergunta, identificacao, categoriaId, id]
                );
            }
        }

        await client.query('COMMIT');
        res.status(200).json({ sucesso: true, mensagem: 'Modelo atualizado com sucesso!' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao atualizar modelo:', error);
        if (error.code === '23505') {
             return res.status(409).json({ sucesso: false, mensagem: `O modelo '${nomeModelo}' já existe.` });
        }
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    } finally {
        client.release();
    }
});

module.exports = router;