const db = require('../db');
const { withTransaction } = require('../database/transaction');

const nomeValido = (nome) => typeof nome === 'string' && nome.trim().length > 0 && nome.trim().length <= 255;
const MAX_PG_INT = 2147483647;
const idValido = (id) => {
    const numero = Number(id);
    return Number.isSafeInteger(numero) && numero > 0 && numero <= MAX_PG_INT
        && (typeof id === 'number' || typeof id === 'string' && /^\d+$/.test(id.trim()));
};
const normalizarNome = (nome) => nome.trim().toUpperCase();
const MAX_LOGO_BYTES = 512 * 1024;
const validarLogo = (valor) => {
    if (valor === undefined || valor === null) return valor;
    if (typeof valor !== 'string') throw new Error('LOGO_INVALIDA');
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(valor);
    if (!match) throw new Error('LOGO_INVALIDA');
    const logo = Buffer.from(match[2], 'base64');
    const mime = `image/${match[1]}`;
    const formatoValido = (mime === 'image/png' && logo.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
        || (mime === 'image/jpeg' && logo.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])))
        || (mime === 'image/webp' && logo.subarray(0, 4).toString() === 'RIFF' && logo.subarray(8, 12).toString() === 'WEBP');
    if (!logo.length || logo.length > MAX_LOGO_BYTES || !formatoValido) throw new Error('LOGO_INVALIDA');
    return { logo, mime };
};
const obterMarcaId = (body) => body.id_marca_fk ?? body.nomeMarca;

const validarMarca = async (client, idMarca) => {
    const { rows } = await client.query('SELECT id FROM marcas WHERE id = $1 FOR SHARE', [idMarca]);
    if (!rows.length) throw new Error('MARCA_INVALIDA');
};

const validarSetor = async (client, idSetor) => {
    const { rows } = await client.query('SELECT id FROM setores WHERE id = $1 AND ativo = 1 FOR SHARE', [idSetor]);
    if (!rows.length) throw new Error('SETOR_INVALIDO');
};

const slugify = (text) => {
    return text.toString().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_').replace(/[^\w-]+/g, '').replace(/--+/g, '_');
};

const categoriasValidas = (categorias) => {
    if (!categorias || typeof categorias !== 'object' || Array.isArray(categorias) || !Object.keys(categorias).length) return false;
    const identificacoes = new Set();
    return Object.entries(categorias).every(([nomeCategoria, dados]) => {
        if (!nomeValido(nomeCategoria)
            || (dados?.ctq !== undefined && typeof dados.ctq !== 'boolean')
            || !Array.isArray(dados?.perguntas)
            || dados.perguntas.length === 0
            || !dados.perguntas.every(nomeValido)) return false;
        return dados.perguntas.every((_pergunta, index) => {
            const identificacao = `${slugify(nomeCategoria)}_${index + 1}`;
            if (identificacao.length > 100 || identificacoes.has(identificacao)) return false;
            identificacoes.add(identificacao);
            return true;
        });
    });
};

const sincronizarCategoriaPadrao = async (client, nomeCategoria, isCtq, arrayPerguntas) => {
    const nomeNorm = normalizarNome(nomeCategoria);
    if (!nomeNorm) return;
    const perguntasLimpas = Array.isArray(arrayPerguntas)
        ? arrayPerguntas.map(p => String(p || '').trim()).filter(Boolean)
        : [];

    await client.query(
        `INSERT INTO categorias_padrao (nome, ctq, perguntas, ativo)
         VALUES ($1, $2, $3::jsonb, 1)
         ON CONFLICT (LOWER(TRIM(nome))) WHERE ativo = 1 DO NOTHING`,
        [nomeNorm, Boolean(isCtq), JSON.stringify(perguntasLimpas)]
    );
};

exports.criarModelo = async (req, res) => {
    const { nomeModelo, categorias, id_setor } = req.body;
    const idMarca = obterMarcaId(req.body);

    if (!nomeValido(nomeModelo) || !idValido(idMarca) || !idValido(id_setor) || !categoriasValidas(categorias)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Dados incompletos. Selecione o setor e preencha todos os campos.' });
    }

    const client = await db.connect(); 

    try {
        await client.query('BEGIN'); 
        await validarMarca(client, Number(idMarca));
        await validarSetor(client, Number(id_setor));

        const sqlModelo = 'INSERT INTO modelo (nome, id_marca_fk, id_setor_fk) VALUES ($1, $2, $3) RETURNING id';
        const resModelo = await client.query(sqlModelo, [nomeModelo.trim(), Number(idMarca), Number(id_setor)]);
        const modeloId = resModelo.rows[0].id;

        for (const nomeCategoria in categorias) {
            const catData = categorias[nomeCategoria];
            const isCtq = catData.ctq ?? false;
            const arrayPerguntas = catData.perguntas;

            await sincronizarCategoriaPadrao(client, nomeCategoria, isCtq, arrayPerguntas);

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
        if (error.message === 'MARCA_INVALIDA') return res.status(400).json({ sucesso: false, mensagem: 'A marca informada não existe.' });
        if (error.message === 'SETOR_INVALIDO') return res.status(400).json({ sucesso: false, mensagem: 'O setor informado não existe ou está inativo.' });
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    } finally {
        client.release(); 
    }
};

exports.listarModelos = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT m.id, m.nome, COALESCE(m.id_marca_fk::text, m.marca) AS marca,
                m.id_marca_fk, ma.nome AS nome_marca, m.ativo, m.id_setor_fk, m.versao
            FROM modelo m
            LEFT JOIN marcas ma ON ma.id = m.id_marca_fk
            ORDER BY m.nome ASC
        `);
        res.status(200).json({ sucesso: true, dados: result.rows });
    } catch (error) {
        console.error('Erro ao buscar lista de modelos:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    }
};

exports.buscarModeloPorId = async (req, res) => {
    const { id } = req.params;
    if (!idValido(id)) return res.status(400).json({ sucesso: false, mensagem: 'ID de modelo inválido.' });
    
    try {
        const modeloResult = await db.query(`
            SELECT m.id, m.nome, m.marca, m.id_marca_fk, ma.nome AS nome_marca,
                m.ativo, m.id_setor_fk, m.versao
            FROM modelo m
            LEFT JOIN marcas ma ON ma.id = m.id_marca_fk
            WHERE m.id = $1
        `, [id]);
        
        if (modeloResult.rows.length === 0) {
            return res.status(404).json({ sucesso: false, mensagem: 'Modelo não encontrado.' });
        }

        const modelo = modeloResult.rows[0];

        const queryDetalhes = `
            SELECT c.categoria, c.ctq, p.pergunta
            FROM categorias c
            JOIN perguntas p ON c.id = p.id_categoria AND p.ativo = 1
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
                nomeMarca: modelo.id_marca_fk || modelo.marca,
                id_marca_fk: modelo.id_marca_fk,
                nome_marca: modelo.nome_marca || modelo.marca,
                ativo: modelo.ativo,
                id_setor: modelo.id_setor_fk,
                versao: modelo.versao,
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
    const { nomeModelo, categorias, ativo, id_setor, versao } = req.body;
    const idMarca = obterMarcaId(req.body);

    if (!idValido(id) || !nomeValido(nomeModelo) || !idValido(idMarca) || !idValido(id_setor) || !idValido(versao) || typeof ativo !== 'boolean' || !categoriasValidas(categorias)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Dados incompletos. Setor, categorias e versão são obrigatórios.' });
    }

    const client = await db.connect();

    try {
        await client.query('BEGIN');
        await validarMarca(client, Number(idMarca));
        await validarSetor(client, Number(id_setor));

        const modeloAtualizado = await client.query(
            'UPDATE modelo SET nome = $1, id_marca_fk = $2, ativo = $3, id_setor_fk = $4, versao = versao + 1 WHERE id = $5 AND versao = $6 RETURNING versao',
            [nomeModelo.trim(), Number(idMarca), ativo, Number(id_setor), id, Number(versao)]
        );
        if (!modeloAtualizado.rowCount) {
            const existe = await client.query('SELECT id FROM modelo WHERE id = $1 FOR SHARE', [id]);
            await client.query('ROLLBACK');
            if (!existe.rows.length) return res.status(404).json({ sucesso: false, mensagem: 'Modelo não encontrado.' });
            return res.status(409).json({
                sucesso: false,
                codigo: 'MODELO_ALTERADO_CONCORRENTEMENTE',
                mensagem: 'Este modelo foi alterado por outro usuário. Recarregue os dados e tente novamente.'
            });
        }

        const perguntasMantidasIds = [];

        for (const nomeCategoria in categorias) {
            const catData = categorias[nomeCategoria];
            const isCtq = catData.ctq ?? false;
            const arrayPerguntas = catData.perguntas;

            await sincronizarCategoriaPadrao(client, nomeCategoria, isCtq, arrayPerguntas);

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
                    'SELECT id FROM perguntas WHERE id_modelo = $1 AND identificacao = $2',
                    [id, identificacao]
                );

                if (resPerg.rows.length > 0) {
                    const pergId = resPerg.rows[0].id;
                    await client.query(
                        'UPDATE perguntas SET pergunta = $1, id_categoria = $2, ativo = 1 WHERE id = $3',
                        [textoPergunta, categoriaId, pergId]
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
        res.status(200).json({ sucesso: true, mensagem: 'Modelo atualizado com sucesso!', versao: modeloAtualizado.rows[0]?.versao });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao atualizar modelo:', error);
        if (error.code === '23505') {
             return res.status(409).json({ sucesso: false, mensagem: `O modelo '${nomeModelo}' já existe.` });
        }
        if (error.message === 'MARCA_INVALIDA') return res.status(400).json({ sucesso: false, mensagem: 'A marca informada não existe.' });
        if (error.message === 'SETOR_INVALIDO') return res.status(400).json({ sucesso: false, mensagem: 'O setor informado não existe ou está inativo.' });
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    } finally {
        client.release();
    }
};
exports._internals = { categoriasValidas, obterMarcaId };
exports.listarMarcas = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, nome, "ultimaAlteracao", logo IS NOT NULL AS tem_logo FROM marcas ORDER BY nome ASC');
        res.status(200).json({ sucesso: true, dados: rows });
    } catch (error) {
        console.error('Erro ao listar marcas:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    }
};

exports.criarMarca = async (req, res) => {
    const { nome, logo } = req.body;
    if (!nomeValido(nome)) return res.status(400).json({ sucesso: false, mensagem: 'O nome da marca é obrigatório.' });

    try {
        const imagem = validarLogo(logo);
        const { rows } = await db.query(
            'INSERT INTO marcas (nome, logo, logo_mime) VALUES ($1, $2, $3) RETURNING id, nome, logo IS NOT NULL AS tem_logo',
            [normalizarNome(nome), imagem?.logo || null, imagem?.mime || null]
        );
        res.status(201).json({ sucesso: true, mensagem: 'Marca criada com sucesso!', marca: rows[0] });
    } catch (error) {
        if (error.message === 'LOGO_INVALIDA') return res.status(400).json({ sucesso: false, mensagem: 'A logo deve ser PNG, JPEG ou WebP e ter no máximo 512 KB.' });
        console.error('Erro ao criar marca:', error);
        if (error.code === '23505') return res.status(409).json({ sucesso: false, mensagem: 'Esta marca já existe.' });
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
    }
};

exports.atualizarMarca = async (req, res) => {
    const { id } = req.params;
    const { nome, logo } = req.body;
    
    if (!idValido(id) || !nomeValido(nome)) return res.status(400).json({ sucesso: false, mensagem: 'ID e nome válido são obrigatórios.' });

    try {
        const imagem = validarLogo(logo);
        const result = logo === undefined
            ? await db.query('UPDATE marcas SET nome = $1, "ultimaAlteracao" = NOW() WHERE id = $2 RETURNING id, nome, logo IS NOT NULL AS tem_logo', [normalizarNome(nome), id])
            : logo === null
                ? await db.query('UPDATE marcas SET nome = $1, logo = NULL, logo_mime = NULL, "ultimaAlteracao" = NOW() WHERE id = $2 RETURNING id, nome, false AS tem_logo', [normalizarNome(nome), id])
                : await db.query('UPDATE marcas SET nome = $1, logo = $2, logo_mime = $3, "ultimaAlteracao" = NOW() WHERE id = $4 RETURNING id, nome, true AS tem_logo', [normalizarNome(nome), imagem.logo, imagem.mime, id]);
        if (result.rowCount === 0) return res.status(404).json({ sucesso: false, mensagem: 'Marca não encontrada.' });
        
        res.status(200).json({ sucesso: true, mensagem: 'Marca atualizada!', marca: result.rows[0] });
    } catch (error) {
        if (error.message === 'LOGO_INVALIDA') return res.status(400).json({ sucesso: false, mensagem: 'A logo deve ser PNG, JPEG ou WebP e ter no máximo 512 KB.' });
        console.error('Erro ao atualizar marca:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
    }
};

exports.buscarLogoMarca = async (req, res) => {
    if (!idValido(req.params.id)) return res.status(400).json({ sucesso: false, mensagem: 'ID inválido.' });
    try {
        const { rows } = await db.query('SELECT logo, logo_mime, "ultimaAlteracao" FROM marcas WHERE id = $1 AND logo IS NOT NULL', [req.params.id]);
        if (!rows.length) return res.status(404).json({ sucesso: false, mensagem: 'Logo não encontrada.' });
        return res.set({ 'Content-Type': rows[0].logo_mime, 'Cache-Control': 'public, max-age=3600' }).send(rows[0].logo);
    } catch (error) {
        console.error('Erro ao buscar logo da marca:', error);
        return res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
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
        res.status(200).json({ sucesso: true, dados: rows });
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
        const result = await db.query('UPDATE setores SET nome = $1, ativo = $2 WHERE id = $3 RETURNING *', [normalizarNome(nome), Number(ativo), id]);
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
        res.status(200).json({ sucesso: true, dados: rows });
    } catch (error) {
        console.error('Erro ao listar células:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
    }
};

exports.criarCelula = async (req, res) => {
    const { nome, id_setor_fk, id_marca_fk } = req.body;
    
    if (!nomeValido(nome) || !idValido(id_setor_fk) || (id_marca_fk !== null && !idValido(id_marca_fk))) {
        return res.status(400).json({ sucesso: false, mensagem: 'Nome e Setor são obrigatórios.' });
    }
    
    try {
        const { rows } = await withTransaction(db, async (client) => {
            await validarSetor(client, Number(id_setor_fk));
            if (id_marca_fk !== null) await validarMarca(client, Number(id_marca_fk));
            return client.query(`
                INSERT INTO celulas_producao (nome, id_setor_fk, id_marca_fk, ativo)
                VALUES ($1, $2, $3, 1) RETURNING *
            `, [normalizarNome(nome), Number(id_setor_fk), id_marca_fk === null ? null : Number(id_marca_fk)]);
        });
        res.status(201).json({ sucesso: true, mensagem: 'Célula criada!', celula: rows[0] });
    } catch (error) {
        console.error('Erro ao criar célula:', error);
        if (error.message === 'MARCA_INVALIDA' || error.message === 'SETOR_INVALIDO') return res.status(400).json({ sucesso: false, mensagem: 'Setor ou marca inválidos.' });
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
    }
};

exports.atualizarCelula = async (req, res) => {
    const { id } = req.params;
    const { nome, id_setor_fk, id_marca_fk, ativo } = req.body;
    if (!idValido(id) || !nomeValido(nome) || !idValido(id_setor_fk) || (id_marca_fk !== null && !idValido(id_marca_fk)) || typeof ativo !== 'boolean') return res.status(400).json({ sucesso: false, mensagem: 'Dados da célula inválidos.' });
    
    try {
        const result = await withTransaction(db, async (client) => {
            await validarSetor(client, Number(id_setor_fk));
            if (id_marca_fk !== null) await validarMarca(client, Number(id_marca_fk));
            return client.query(`
                UPDATE celulas_producao
                SET nome = $1, id_setor_fk = $2, id_marca_fk = $3, ativo = $4
                WHERE id = $5 RETURNING *
            `, [normalizarNome(nome), Number(id_setor_fk), id_marca_fk === null ? null : Number(id_marca_fk), Number(ativo), id]);
        });
        if (!result.rowCount) return res.status(404).json({ sucesso: false, mensagem: 'Célula não encontrada.' });
        res.status(200).json({ sucesso: true, mensagem: 'Célula atualizada!', celula: result.rows[0] });
    } catch (error) {
        console.error('Erro ao atualizar célula:', error);
        if (error.message === 'MARCA_INVALIDA' || error.message === 'SETOR_INVALIDO') return res.status(400).json({ sucesso: false, mensagem: 'Setor ou marca inválidos.' });
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
        res.status(200).json({ sucesso: true, dados: rows });
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
        const result = await db.query('UPDATE unidades SET nome = $1, ativo = $2 WHERE id = $3 RETURNING *', [normalizarNome(nome), Number(ativo), id]);
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

exports.listarCategoriasPadrao = async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT id, nome, ctq, perguntas, ativo, "ultimaAlteracao"
            FROM categorias_padrao
            WHERE ativo = 1
            ORDER BY nome ASC
        `);
        res.status(200).json({ sucesso: true, dados: rows });
    } catch (error) {
        console.error('Erro ao listar categorias padrão:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao listar categorias.' });
    }
};

exports.criarCategoriaPadrao = async (req, res) => {
    const { nome, ctq, perguntas } = req.body;
    if (!nomeValido(nome) || (ctq !== undefined && typeof ctq !== 'boolean')) {
        return res.status(400).json({ sucesso: false, mensagem: 'O nome da categoria é obrigatório.' });
    }
    const nomeNormalizado = normalizarNome(nome);
    const isCtq = Boolean(ctq);
    const perguntasArray = Array.isArray(perguntas) 
        ? perguntas.map(p => String(p || '').trim()).filter(Boolean)
        : [];

    try {
        const { rows } = await db.query(
            `INSERT INTO categorias_padrao (nome, ctq, perguntas, ativo) 
             VALUES ($1, $2, $3::jsonb, 1)
             ON CONFLICT (LOWER(TRIM(nome))) WHERE ativo = 1 DO NOTHING
             RETURNING *`,
            [nomeNormalizado, isCtq, JSON.stringify(perguntasArray)]
        );
        if (rows.length === 0) {
            return res.status(409).json({ sucesso: false, mensagem: `Já existe uma categoria cadastrada com o nome '${nomeNormalizado}'.` });
        }
        res.status(201).json({ sucesso: true, mensagem: 'Categoria cadastrada com sucesso!', categoria: rows[0] });
    } catch (error) {
        console.error('Erro ao criar categoria padrão:', error);
        if (error.code === '23505') {
            return res.status(409).json({ sucesso: false, mensagem: 'Esta categoria já existe no catálogo.' });
        }
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao criar categoria.' });
    }
};

exports.atualizarCategoriaPadrao = async (req, res) => {
    const { id } = req.params;
    const { nome, ctq, perguntas } = req.body;
    if (!idValido(id) || !nomeValido(nome) || (ctq !== undefined && typeof ctq !== 'boolean')) {
        return res.status(400).json({ sucesso: false, mensagem: 'ID e nome válido são obrigatórios.' });
    }
    const nomeNormalizado = normalizarNome(nome);
    const isCtq = Boolean(ctq);
    const perguntasArray = Array.isArray(perguntas) 
        ? perguntas.map(p => String(p || '').trim()).filter(Boolean)
        : [];

    try {
        const duplicado = await db.query(
            'SELECT id FROM categorias_padrao WHERE LOWER(TRIM(nome)) = LOWER(TRIM($1)) AND id != $2 AND ativo = 1',
            [nomeNormalizado, id]
        );
        if (duplicado.rowCount > 0) {
            return res.status(409).json({ sucesso: false, mensagem: `Já existe outra categoria com o nome '${nomeNormalizado}'.` });
        }

        const result = await db.query(
            `UPDATE categorias_padrao 
             SET nome = $1, ctq = $2, perguntas = $3::jsonb, "ultimaAlteracao" = now() 
             WHERE id = $4 AND ativo = 1 RETURNING *`,
            [nomeNormalizado, isCtq, JSON.stringify(perguntasArray), id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ sucesso: false, mensagem: 'Categoria não encontrada.' });
        }
        res.status(200).json({ sucesso: true, mensagem: 'Categoria atualizada com sucesso!', categoria: result.rows[0] });
    } catch (error) {
        console.error('Erro ao atualizar categoria padrão:', error);
        res.status(error.code === '23505' ? 409 : 500).json({ sucesso: false, mensagem: 'Erro interno ao atualizar categoria.' });
    }
};

exports.excluirCategoriaPadrao = async (req, res) => {
    const { id } = req.params;
    if (!idValido(id)) return res.status(400).json({ sucesso: false, mensagem: 'ID inválido.' });

    try {
        const result = await db.query('UPDATE categorias_padrao SET ativo = 0, "ultimaAlteracao" = now() WHERE id = $1', [id]);
        if (!result.rowCount) return res.status(404).json({ sucesso: false, mensagem: 'Categoria não encontrada.' });
        res.status(200).json({ sucesso: true, mensagem: 'Categoria inativada com sucesso.' });
    } catch (error) {
        console.error('Erro ao excluir categoria padrão:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao excluir categoria.' });
    }
};
