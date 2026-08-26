const db = require('../db');

const nomeValido = (nome) => typeof nome === 'string' && nome.trim().length > 0 && nome.trim().length <= 255;
const idValido = (id) => Number.isInteger(Number(id)) && Number(id) > 0;
const normalizarNome = (nome) => nome.trim().toUpperCase();

const slugify = (text) => {
    return text.toString().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_').replace(/[^\w-]+/g, '').replace(/--+/g, '_');
};

exports.criarModelo = async (req, res) => {
    const { nomeModelo, nomeMarca, categorias, id_setor } = req.body;

    if (!nomeValido(nomeModelo) || !categorias || !idValido(id_setor) || Object.keys(categorias).length === 0) {
        return res.status(400).json({ sucesso: false, mensagem: 'Dados incompletos. Selecione o setor e preencha todos os campos.' });
    }

    const client = await db.connect(); 

    try {
        await client.query('BEGIN'); 

        const sqlModelo = 'INSERT INTO modelo (nome, marca, id_setor_fk) VALUES ($1, $2, $3) RETURNING id';
        const resModelo = await client.query(sqlModelo, [nomeModelo.trim(), nomeValido(nomeMarca) ? nomeMarca.trim() : null, id_setor]);
        const modeloId = resModelo.rows[0].id;

        for (const nomeCategoria in categorias) {
            const catData = categorias[nomeCategoria];
            if (!nomeValido(nomeCategoria) || !Array.isArray(catData?.perguntas) || !catData.perguntas.length || catData.perguntas.some((pergunta) => !nomeValido(pergunta))) {
                throw new Error('DADOS_MODELO_INVALIDOS');
            }
            const isCtq = catData.ctq || false;
            const arrayPerguntas = catData.perguntas || [];

            const sqlCategoria = 'INSERT INTO categorias (categoria, id_modelo, ctq) VALUES ($1, $2, $3) RETURNING id';
            const resCategoria = await client.query(sqlCategoria, [nomeCategoria, modeloId, isCtq]);
            const categoriaId = resCategoria.rows[0].id;

            for (const [index, textoPergunta] of arrayPerguntas.entries()) {
                const identificacao = `${slugify(nomeCategoria)}_${index + 1}`;
                
                const sqlPergunta = `
                    INSERT INTO perguntas (pergunta, identificacao, id_categoria, id_modelo, ativo) 
                    VALUES ($1, $2, $3, $4, 1)
                `;
                await client.query(sqlPergunta, [textoPergunta, identificacao, categoriaId, modeloId]);
            }
        }

        await client.query('COMMIT'); 
        res.status(201).json({ sucesso: true, mensagem: 'Modelo de checklist criado com sucesso!' });

    } catch (error) {
        await client.query('ROLLBACK'); 
        console.error('Erro ao criar modelo:', error);
        
        if (error.code === '23505') { 
             return res.status(409).json({ sucesso: false, mensagem: `O modelo '${nomeModelo}' já existe.` });
        }
        res.status(error.message === 'DADOS_MODELO_INVALIDOS' ? 400 : 500).json({ sucesso: false, mensagem: error.message === 'DADOS_MODELO_INVALIDOS' ? 'Categorias e perguntas válidas são obrigatórias.' : 'Erro interno no servidor.' });
    } finally {
        client.release(); 
    }
};

exports.listarModelos = async (req, res) => {
    try {
        const result = await db.query('SELECT id, nome, marca, ativo, id_setor_fk FROM modelo ORDER BY nome ASC');
        res.status(200).json({ sucesso: true, modelos: result.rows });
    } catch (error) {
        console.error('Erro ao buscar lista de modelos:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    }
};

exports.buscarModeloPorId = async (req, res) => {
    const { id } = req.params;
    
    try {
        const modeloResult = await db.query('SELECT id, nome, marca, ativo, id_setor_fk FROM modelo WHERE id = $1', [id]);
        
        if (modeloResult.rows.length === 0) {
            return res.status(404).json({ sucesso: false, mensagem: 'Modelo não encontrado.' });
        }

        const modelo = modeloResult.rows[0];

        const queryDetalhes = `
            SELECT c.categoria, c.ctq, p.pergunta
            FROM categorias c
            LEFT JOIN perguntas p ON c.id = p.id_categoria AND p.ativo = 1
            WHERE c.id_modelo = $1
            ORDER BY c.id, p.id
        `;
        const detalhesResult = await db.query(queryDetalhes, [id]);

        const categoriasFormatadas = {};
        
        detalhesResult.rows.forEach(row => {
            if (!categoriasFormatadas[row.categoria]) {
                categoriasFormatadas[row.categoria] = {
                    ctq: row.ctq || false,
                    perguntas: []
                };
            }
            if (row.pergunta) {
                categoriasFormatadas[row.categoria].perguntas.push(row.pergunta);
            }
        });

        res.status(200).json({
            sucesso: true,
            modelo: {
                id: modelo.id,
                nomeModelo: modelo.nome,
                nomeMarca: modelo.marca,
                ativo: modelo.ativo,
                id_setor: modelo.id_setor_fk,
                categorias: categoriasFormatadas
            }
        });

    } catch (error) {
        console.error('Erro ao buscar modelo:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    }
};

exports.atualizarModelo = async (req, res) => {
    const { id } = req.params;
    const { nomeModelo, nomeMarca, categorias, ativo, id_setor } = req.body;

    if (!idValido(id) || !nomeValido(nomeModelo) || !categorias || !idValido(id_setor) || Object.keys(categorias).length === 0) {
        return res.status(400).json({ sucesso: false, mensagem: 'Dados incompletos. Setor e categorias são obrigatórios.' });
    }

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const modeloAtualizado = await client.query(
            'UPDATE modelo SET nome = $1, marca = $2, ativo = $3, id_setor_fk = $4 WHERE id = $5', 
            [nomeModelo, nomeMarca, ativo, id_setor, id]
        );
        if (!modeloAtualizado.rowCount) {
            await client.query('ROLLBACK');
            return res.status(404).json({ sucesso: false, mensagem: 'Modelo não encontrado.' });
        }

        const perguntasMantidasIds = [];

        for (const nomeCategoria in categorias) {
            const catData = categorias[nomeCategoria];
            const isCtq = catData.ctq || false;
            const arrayPerguntas = catData.perguntas || [];

            let categoriaId;
            const resCat = await client.query('SELECT id FROM categorias WHERE categoria = $1 AND id_modelo = $2', [nomeCategoria, id]);
            
            if (resCat.rows.length > 0) {
                categoriaId = resCat.rows[0].id;
                await client.query('UPDATE categorias SET ctq = $1 WHERE id = $2', [isCtq, categoriaId]);
            } else {
                const insCat = await client.query(
                    'INSERT INTO categorias (categoria, id_modelo, ctq) VALUES ($1, $2, $3) RETURNING id', 
                    [nomeCategoria, id, isCtq]
                );
                categoriaId = insCat.rows[0].id;
            }

            for (const [index, textoPergunta] of arrayPerguntas.entries()) {
                const identificacao = `${slugify(nomeCategoria)}_${index + 1}`;
                
                const resPerg = await client.query(
                    'SELECT id FROM perguntas WHERE id_categoria = $1 AND pergunta = $2', 
                    [categoriaId, textoPergunta]
                );

                if (resPerg.rows.length > 0) {
                    const pergId = resPerg.rows[0].id;
                    await client.query(
                        'UPDATE perguntas SET ativo = 1, identificacao = $1 WHERE id = $2', 
                        [identificacao, pergId]
                    );
                    perguntasMantidasIds.push(pergId);
                } else {
                    const insPerg = await client.query(
                        `INSERT INTO perguntas (pergunta, identificacao, id_categoria, id_modelo, ativo) 
                         VALUES ($1, $2, $3, $4, 1) RETURNING id`, 
                        [textoPergunta, identificacao, categoriaId, id]
                    );
                    perguntasMantidasIds.push(insPerg.rows[0].id);
                }
            }
        }

        if (perguntasMantidasIds.length > 0) {
            await client.query(
                'UPDATE perguntas SET ativo = 0 WHERE id_modelo = $1 AND id != ALL($2::int[])', 
                [id, perguntasMantidasIds]
            );
        } else {
            await client.query('UPDATE perguntas SET ativo = 0 WHERE id_modelo = $1', [id]);
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
};
exports.listarMarcas = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM marcas ORDER BY nome ASC');
        res.status(200).json({ sucesso: true, dados: rows });
    } catch (error) {
        console.error('Erro ao listar marcas:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    }
};

exports.criarMarca = async (req, res) => {
    const { nome } = req.body;
    if (!nomeValido(nome)) return res.status(400).json({ sucesso: false, mensagem: 'O nome da marca é obrigatório.' });

    try {
        const { rows } = await db.query('INSERT INTO marcas (nome) VALUES ($1) RETURNING *', [normalizarNome(nome)]);
        res.status(201).json({ sucesso: true, mensagem: 'Marca criada com sucesso!', marca: rows[0] });
    } catch (error) {
        console.error('Erro ao criar marca:', error);
        if (error.code === '23505') return res.status(409).json({ sucesso: false, mensagem: 'Esta marca já existe.' });
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
    }
};

exports.atualizarMarca = async (req, res) => {
    const { id } = req.params;
    const { nome } = req.body;
    
    if (!idValido(id) || !nomeValido(nome)) return res.status(400).json({ sucesso: false, mensagem: 'ID e nome válido são obrigatórios.' });

    try {
        const result = await db.query('UPDATE marcas SET nome = $1 WHERE id = $2 RETURNING *', [normalizarNome(nome), id]);
        if (result.rowCount === 0) return res.status(404).json({ sucesso: false, mensagem: 'Marca não encontrada.' });
        
        res.status(200).json({ sucesso: true, mensagem: 'Marca atualizada!', marca: result.rows[0] });
    } catch (error) {
        console.error('Erro ao atualizar marca:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
    }
};

exports.excluirMarca = async (req, res) => {
    const { id } = req.params;
    if (!idValido(id)) return res.status(400).json({ sucesso: false, mensagem: 'ID inválido.' });
    try {
        const result = await db.query('DELETE FROM marcas WHERE id = $1', [id]);
        if (!result.rowCount) return res.status(404).json({ sucesso: false, mensagem: 'Marca não encontrada.' });
        
        res.status(200).json({ sucesso: true, mensagem: 'Marca removida/inativada com sucesso.' });
    } catch (error) {
        console.error('Erro ao excluir marca:', error);
        if (error.code === '23503') return res.status(409).json({ sucesso: false, mensagem: 'Não é possível excluir esta marca pois existem modelos vinculados a ela.' });
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao excluir.' });
    }
};

exports.listarSetores = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM setores WHERE ativo = 1 ORDER BY nome ASC');
        res.status(200).json({ sucesso: true, setores: rows });
    } catch (error) {
        console.error('Erro ao listar setores:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
    }
};

exports.criarSetor = async (req, res) => {
    const { nome } = req.body;
    if (!nomeValido(nome)) return res.status(400).json({ sucesso: false, mensagem: 'Nome do setor é obrigatório.' });
    try {
        const { rows } = await db.query('INSERT INTO setores (nome, ativo) VALUES ($1, 1) RETURNING *', [normalizarNome(nome)]);
        res.status(201).json({ sucesso: true, mensagem: 'Setor criado com sucesso!', setor: rows[0] });
    } catch (error) {
        console.error('Erro ao criar setor:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
    }
};

exports.atualizarSetor = async (req, res) => {
    const { id } = req.params;
    const { nome, ativo } = req.body;
    if (!idValido(id) || !nomeValido(nome) || typeof ativo !== 'boolean') return res.status(400).json({ sucesso: false, mensagem: 'ID, nome e status válido são obrigatórios.' });
    try {
        const result = await db.query('UPDATE setores SET nome = $1, ativo = $2 WHERE id = $3 RETURNING *', [normalizarNome(nome), ativo, id]);
        if (result.rowCount === 0) return res.status(404).json({ sucesso: false, mensagem: 'Setor não encontrado.' });
        res.status(200).json({ sucesso: true, mensagem: 'Setor atualizado!', setor: result.rows[0] });
    } catch (error) {
        console.error('Erro ao atualizar setor:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
    }
};

exports.excluirSetor = async (req, res) => {
    const { id } = req.params;
    if (!idValido(id)) return res.status(400).json({ sucesso: false, mensagem: 'ID inválido.' });
    try {
        const result = await db.query('UPDATE setores SET ativo = 0 WHERE id = $1', [id]);
        if (!result.rowCount) return res.status(404).json({ sucesso: false, mensagem: 'Setor não encontrado.' });
        res.status(200).json({ sucesso: true, mensagem: 'Setor inativado com sucesso.' });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
    }
};

exports.listarCelulas = async (req, res) => {
    try {
        const query = `
            SELECT 
                cp.*, 
                s.nome AS nome_setor,
                m.nome AS nome_marca 
            FROM celulas_producao cp 
            LEFT JOIN setores s ON cp.id_setor_fk = s.id 
            LEFT JOIN marcas m ON cp.id_marca_fk = m.id
            WHERE cp.ativo = 1
            ORDER BY cp.nome ASC
        `;
        const { rows } = await db.query(query);
        res.status(200).json({ sucesso: true, celulas: rows });
    } catch (error) {
        console.error('Erro ao listar células:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
    }
};

exports.criarCelula = async (req, res) => {
    const { nome, id_setor_fk, id_marca_fk } = req.body;
    
    if (!nomeValido(nome) || !idValido(id_setor_fk) || (id_marca_fk != null && !idValido(id_marca_fk))) {
        return res.status(400).json({ sucesso: false, mensagem: 'Nome e Setor são obrigatórios.' });
    }
    
    try {
        const query = `
            INSERT INTO celulas_producao (nome, id_setor_fk, id_marca_fk, ativo) 
            VALUES ($1, $2, $3, 1) RETURNING *
        `;
        const { rows } = await db.query(query, [normalizarNome(nome), id_setor_fk, id_marca_fk || null]);
        res.status(201).json({ sucesso: true, mensagem: 'Célula criada!', celula: rows[0] });
    } catch (error) {
        console.error('Erro ao criar célula:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
    }
};

exports.atualizarCelula = async (req, res) => {
    const { id } = req.params;
    const { nome, id_setor_fk, id_marca_fk, ativo } = req.body;
    if (!idValido(id) || !nomeValido(nome) || !idValido(id_setor_fk) || (id_marca_fk != null && !idValido(id_marca_fk)) || typeof ativo !== 'boolean') return res.status(400).json({ sucesso: false, mensagem: 'Dados da célula inválidos.' });
    
    try {
        const query = `
            UPDATE celulas_producao 
            SET nome = $1, id_setor_fk = $2, id_marca_fk = $3, ativo = $4 
            WHERE id = $5 RETURNING *
        `;
        const result = await db.query(query, [normalizarNome(nome), id_setor_fk, id_marca_fk || null, ativo, id]);
        if (!result.rowCount) return res.status(404).json({ sucesso: false, mensagem: 'Célula não encontrada.' });
        res.status(200).json({ sucesso: true, mensagem: 'Célula atualizada!', celula: result.rows[0] });
    } catch (error) {
        console.error('Erro ao atualizar célula:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
    }
};

exports.excluirCelula = async (req, res) => {
    const { id } = req.params;
    if (!idValido(id)) return res.status(400).json({ sucesso: false, mensagem: 'ID inválido.' });
    try {
        const result = await db.query('UPDATE celulas_producao SET ativo = 0 WHERE id = $1', [id]);
        if (!result.rowCount) return res.status(404).json({ sucesso: false, mensagem: 'Célula não encontrada.' });
        res.status(200).json({ sucesso: true, mensagem: 'Célula inativada com sucesso.' });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
    }
};

exports.listarUnidades = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM unidades WHERE ativo = 1 ORDER BY nome ASC');
        res.status(200).json({ sucesso: true, unidades: rows });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
    }
};

exports.criarUnidade = async (req, res) => {
    const { nome } = req.body;
    if (!nomeValido(nome)) return res.status(400).json({ sucesso: false, mensagem: 'Nome é obrigatório.' });
    try {
        const { rows } = await db.query('INSERT INTO unidades (nome, ativo) VALUES ($1, 1) RETURNING *', [normalizarNome(nome)]);
        res.status(201).json({ sucesso: true, mensagem: 'Unidade criada!', unidade: rows[0] });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
    }
};

exports.atualizarUnidade = async (req, res) => {
    const { id } = req.params;
    const { nome, ativo } = req.body;
    if (!idValido(id) || !nomeValido(nome) || typeof ativo !== 'boolean') return res.status(400).json({ sucesso: false, mensagem: 'ID, nome e status válido são obrigatórios.' });
    try {
        const result = await db.query('UPDATE unidades SET nome = $1, ativo = $2 WHERE id = $3 RETURNING *', [normalizarNome(nome), ativo, id]);
        if (!result.rowCount) return res.status(404).json({ sucesso: false, mensagem: 'Unidade não encontrada.' });
        res.status(200).json({ sucesso: true, mensagem: 'Unidade atualizada!', unidade: result.rows[0] });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
    }
};

exports.excluirUnidade = async (req, res) => {
    const { id } = req.params;
    if (!idValido(id)) return res.status(400).json({ sucesso: false, mensagem: 'ID inválido.' });
    try {
        const result = await db.query('UPDATE unidades SET ativo = 0 WHERE id = $1', [id]);
        if (!result.rowCount) return res.status(404).json({ sucesso: false, mensagem: 'Unidade não encontrada.' });
        res.status(200).json({ sucesso: true, mensagem: 'Unidade inativada com sucesso.' });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
    }
};

exports.listarTurnos = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM turnos ORDER BY nome ASC');
        res.status(200).json({ sucesso: true, dados: result.rows });
    } catch (error) {
        console.error('Erro ao listar turnos:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao carregar turnos.' });
    }
};

exports.criarTurno = async (req, res) => {
    const { nome, entrada_inicio, entrada_fim, intervalo_inicio, intervalo_fim } = req.body;
    if (!nomeValido(nome) || !entrada_inicio || !entrada_fim || !intervalo_inicio || !intervalo_fim) return res.status(400).json({ sucesso: false, mensagem: 'Todos os campos do turno são obrigatórios.' });
    try {
        const sql = `
            INSERT INTO turnos (nome, entrada_inicio, entrada_fim, intervalo_inicio, intervalo_fim)
            VALUES ($1, $2, $3, $4, $5) RETURNING *`;
        const values = [nome, entrada_inicio, entrada_fim, intervalo_inicio, intervalo_fim];
        const result = await db.query(sql, values);
        res.status(201).json({ sucesso: true, dado: result.rows[0] });
    } catch (error) {
        console.error('Erro ao criar turno:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao criar turno.' });
    }
};

exports.atualizarTurno = async (req, res) => {
    const { id } = req.params;
    const { nome, entrada_inicio, entrada_fim, intervalo_inicio, intervalo_fim } = req.body;
    if (!idValido(id) || !nomeValido(nome) || !entrada_inicio || !entrada_fim || !intervalo_inicio || !intervalo_fim) return res.status(400).json({ sucesso: false, mensagem: 'Dados do turno inválidos.' });
    try {
        const sql = `
            UPDATE turnos 
            SET nome = $1, entrada_inicio = $2, entrada_fim = $3, intervalo_inicio = $4, intervalo_fim = $5
            WHERE id = $6 RETURNING *`;
        const values = [nome, entrada_inicio, entrada_fim, intervalo_inicio, intervalo_fim, id];
        const result = await db.query(sql, values);
        if (!result.rowCount) return res.status(404).json({ sucesso: false, mensagem: 'Turno não encontrado.' });
        res.status(200).json({ sucesso: true, dado: result.rows[0] });
    } catch (error) {
        console.error('Erro ao atualizar turno:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar turno.' });
    }
};

exports.excluirTurno = async (req, res) => {
    const { id } = req.params;
    if (!idValido(id)) return res.status(400).json({ sucesso: false, mensagem: 'ID inválido.' });
    try {
        const result = await db.query('DELETE FROM turnos WHERE id = $1', [id]);
        if (!result.rowCount) return res.status(404).json({ sucesso: false, mensagem: 'Turno não encontrado.' });
        res.status(200).json({ sucesso: true, mensagem: 'Turno removido com sucesso.' });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao remover. O turno pode estar vinculado a utilizadores.' });
    }
};
