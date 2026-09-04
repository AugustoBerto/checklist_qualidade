const db = require('../db');
const { withTransaction } = require('../database/transaction');

const RESPOSTAS_VALIDAS = new Set(['Conforme', 'Não Conforme', 'N/A']);
const MAX_FOTO_BYTES = 2 * 1024 * 1024;
const MAX_ASSINATURA_BYTES = 1024 * 1024;
const MAX_PG_INT = 2147483647;

class ErroValidacao extends Error {
    constructor(mensagem, status = 400) {
        super(mensagem);
        this.status = status;
    }
}

const base64ParaImagem = (valor, limite, campo) => {
    if (typeof valor !== 'string') throw new ErroValidacao(`${campo} deve ser uma imagem Base64.`);
    const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(valor);
    if (!match || match[2].length % 4 === 1) throw new ErroValidacao(`${campo} possui formato de imagem inválido.`);

    const buffer = Buffer.from(match[2], 'base64');
    if (!buffer.length || buffer.toString('base64').replace(/=+$/, '') !== match[2].replace(/=+$/, '')) {
        throw new ErroValidacao(`${campo} possui conteúdo Base64 inválido.`);
    }
    const formatosValidos = {
        jpeg: buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
        png: buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
        webp: buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP',
    };
    if (!formatosValidos[match[1]]) throw new ErroValidacao(`${campo} não corresponde ao formato informado.`);
    if (buffer.length > limite) throw new ErroValidacao(`${campo} excede o limite permitido.`, 413);
    return { buffer, mime: `image/${match[1]}` };
};
const base64ParaBuffer = (valor, limite, campo) => base64ParaImagem(valor, limite, campo).buffer;

const validarRespostas = (respostas, perguntas) => {
    if (!Array.isArray(respostas) || respostas.length !== perguntas.length) {
        throw new ErroValidacao('Todas as perguntas ativas devem ser respondidas exatamente uma vez.');
    }
    const perguntasPorId = new Map(perguntas.map((pergunta) => [pergunta.id, pergunta]));
    const ids = new Set();

    for (const item of respostas) {
        const idPergunta = Number(item?.id_pergunta);
        if (!Number.isInteger(idPergunta) || !perguntasPorId.has(idPergunta) || ids.has(idPergunta)) {
            throw new ErroValidacao('As respostas possuem perguntas inválidas ou duplicadas.');
        }
        ids.add(idPergunta);
        if (!RESPOSTAS_VALIDAS.has(item.resposta)) {
            throw new ErroValidacao('A resposta informada é inválida.');
        }
        if (item.resposta === 'Não Conforme') {
            if (item.foto != null && item.foto !== '') {
                base64ParaBuffer(item.foto, MAX_FOTO_BYTES, 'A foto da não conformidade');
            }
            if (typeof item.observacao !== 'string' || !item.observacao.trim()) {
                throw new ErroValidacao('A observação é obrigatória para itens não conformes.');
            }
        } else if (item.foto != null && item.foto !== '') {
            base64ParaBuffer(item.foto, MAX_FOTO_BYTES, 'A foto');
        }
    }
};

const validarAssinaturasCategorias = (respostas, perguntas, assinaturasRecebidas = {}) => {
    const perguntasPorId = new Map(perguntas.map((p) => [p.id, p]));
    const categoriasComNC = new Set();

    for (const item of respostas) {
        if (item.resposta === 'Não Conforme') {
            const p = perguntasPorId.get(Number(item.id_pergunta));
            const cat = p?.categoria || 'Geral';
            categoriasComNC.add(cat);
        }
    }

    const assinaturasProcessadas = {};
    for (const cat of categoriasComNC) {
        const assinaturaData = assinaturasRecebidas?.[cat];
        if (!assinaturaData || typeof assinaturaData !== 'string') {
            throw new ErroValidacao(`A assinatura para a categoria "${cat}" é obrigatória devido aos itens não conformes.`);
        }
        const img = base64ParaImagem(assinaturaData, MAX_ASSINATURA_BYTES, `A assinatura da categoria "${cat}"`);
        assinaturasProcessadas[cat] = {
            mime: img.mime,
            imagem: `data:${img.mime};base64,${img.buffer.toString('base64')}`,
        };
    }

    return assinaturasProcessadas;
};

const idObrigatorioValido = (id) => (typeof id === 'number' || typeof id === 'string')
    && Number.isInteger(Number(id))
    && Number(id) > 0
    && Number(id) <= MAX_PG_INT
    && (typeof id === 'number' || /^\d+$/.test(id.trim()));

const timestampOpcionalValido = (valor) => valor == null
    || (typeof valor === 'string' && valor.trim().length > 0 && Number.isFinite(Date.parse(valor)));

const prepararRespostas = (respostas) => {
    const evidencias = [];
    const respostasPersistidas = respostas.map((item) => {
        const ehNaoConforme = item.resposta === 'Não Conforme';
        const resposta = {
            id_pergunta: Number(item.id_pergunta),
            resposta: item.resposta,
            observacao: ehNaoConforme ? (item.observacao ?? null) : null,
        };
        if (item.foto != null && item.foto !== '') {
            const imagem = base64ParaImagem(item.foto, MAX_FOTO_BYTES, 'A foto');
            evidencias.push({
                idPergunta: resposta.id_pergunta,
                mime: imagem.mime,
                tamanho: imagem.buffer.length,
                conteudo: imagem.buffer,
            });
        }
        return resposta;
    });
    return { respostasPersistidas, evidencias };
};

const snapshotV2 = ({ modelo, setorId, celulaId, auditor, perguntas, inicio, totalEvidencias, assinaturasCategorias }) => ({
    schema: 2,
    modelo: {
        id: modelo.id,
        nome: modelo.nome,
        marca: modelo.marca ?? null,
        id_marca_fk: modelo.id_marca_fk ?? null,
        versao: modelo.versao ?? 1,
    },
    marca: {
        id: modelo.id_marca_fk ?? null,
        nome: modelo.marca ?? null,
    },
    setor: {
        id: modelo.setor_id ?? setorId,
        nome: modelo.setor_nome ?? null,
    },
    celula: {
        id: modelo.celula_id ?? celulaId,
        nome: modelo.celula_nome ?? null,
    },
    auditor: {
        id: auditor?.id ?? null,
        nome: auditor?.nome ?? null,
        matricula: auditor?.matricula ?? null,
        funcao: auditor?.funcao ?? null,
        papel: auditor?.papel ?? null,
    },
    unidade: {
        id: auditor?.unidade_id ?? null,
        nome: auditor?.unidade_nome ?? null,
    },
    inicio: inicio || null,
    evidencias: { total: totalEvidencias },
    perguntas: perguntas.map(({ id, pergunta, identificacao, categoria, ctq }) => ({
        id, pergunta, identificacao, categoria, ctq,
    })),
    assinaturas_categorias: assinaturasCategorias || {},
});

exports.buscarPerguntas = async (req, res) => {
    const modeloId = idObrigatorioValido(req.params.modelo) ? Number(req.params.modelo) : null;
    if (modeloId === null) return res.status(400).json({ sucesso: false, mensagem: 'Modelo inválido.' });
    try {
        const { rows } = await db.query(`
            SELECT p.id AS id_pergunta, c.id AS id_categoria, c.categoria, c.ctq,
                p.pergunta, p.identificacao, m.nome AS nome_modelo, m.id AS id_modelo_fk,
                m.versao AS modelo_versao
            FROM perguntas p
            JOIN modelo m ON p.id_modelo = m.id
            JOIN categorias c ON p.id_categoria = c.id
            WHERE p.id_modelo = $1 AND p.ativo = 1 AND m.ativo = true
            ORDER BY c.id, p.id
        `, [modeloId]);
        if (!rows.length) return res.status(404).json({ sucesso: false, mensagem: 'Modelo ativo sem perguntas não encontrado.' });
        const agrupado = Object.create(null);
        rows.forEach((row) => {
            const categoria = row.categoria || 'SEM CATEGORIA';
            (agrupado[categoria] ||= []).push({ id: row.id_pergunta, texto: row.pergunta, variavel: row.identificacao, modelo: row.nome_modelo, id_modelo: row.id_modelo_fk, ctq: row.ctq || false });
        });
        res.json({
            sucesso: true,
            modelo: { id: rows[0].id_modelo_fk, nome: rows[0].nome_modelo, versao: rows[0].modelo_versao },
            respostasAgrupadas: agrupado
        });
    } catch (err) {
        console.error('Erro ao buscar perguntas:', err);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao buscar perguntas.' });
    }
};

exports.salvarChecklist = async (req, res) => {
    const { id_modelo, id_setor, id_celula, assinatura, respostas, inicio_checklist } = req.body;
    const idUsuarioFinal = req.usuario?.id;
    if (!idUsuarioFinal || !idObrigatorioValido(id_modelo) || !idObrigatorioValido(id_setor)
        || !idObrigatorioValido(id_celula) || !timestampOpcionalValido(inicio_checklist)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Dados incompletos ou inválidos.' });
    }
    try {
        const result = await withTransaction(db, async (client) => {
            const modeloRes = await client.query(`
                SELECT m.id, m.nome, COALESCE(ma.nome, m.marca) AS marca, m.id_marca_fk,
                    m.versao, s.id AS setor_id, s.nome AS setor_nome,
                    c.id AS celula_id, c.nome AS celula_nome
                FROM modelo m
                LEFT JOIN marcas ma ON ma.id = m.id_marca_fk
                JOIN setores s ON s.id = $2 AND s.ativo = 1
                JOIN celulas_producao c ON c.id = $3 AND c.ativo = 1
                WHERE m.id = $1
                  AND m.ativo = true
                  AND m.id_setor_fk = s.id
                  AND c.id_setor_fk = s.id
                  AND (c.id_marca_fk IS NULL OR c.id_marca_fk = m.id_marca_fk)
                FOR SHARE OF m, s, c
            `, [id_modelo, id_setor, id_celula]);
            if (!modeloRes.rows.length) throw new ErroValidacao('Modelo, setor ou célula inválidos ou incompatíveis.');
            const auditorRes = await client.query(
                `SELECT u.id, u.nome, u.matricula, u.funcao, u.papel,
                    un.id AS unidade_id, un.nome AS unidade_nome
                 FROM usuarios u
                 LEFT JOIN unidades un ON un.id = u.id_unidade_fk
                 WHERE u.id = $1 FOR SHARE OF u`,
                [idUsuarioFinal]
            );
            const perguntasRes = await client.query(`
                SELECT p.id, p.pergunta, p.identificacao, c.categoria, c.ctq
                FROM perguntas p JOIN categorias c ON c.id = p.id_categoria
                WHERE p.id_modelo = $1 AND p.ativo = 1 ORDER BY c.id, p.id FOR SHARE
            `, [id_modelo]);
            if (!perguntasRes.rows.length) throw new ErroValidacao('O modelo não possui perguntas ativas.');
            validarRespostas(respostas, perguntasRes.rows);
            const assinaturasCategorias = validarAssinaturasCategorias(respostas, perguntasRes.rows, req.body.assinaturas_categorias);
            const assinaturaImagem = base64ParaImagem(assinatura, MAX_ASSINATURA_BYTES, 'A assinatura');
            const { respostasPersistidas, evidencias } = prepararRespostas(respostas);
            const snapshot = snapshotV2({
                modelo: modeloRes.rows[0],
                setorId: id_setor,
                celulaId: id_celula,
                auditor: auditorRes.rows[0] || { id: idUsuarioFinal },
                perguntas: perguntasRes.rows,
                inicio: inicio_checklist,
                totalEvidencias: evidencias.length,
                assinaturasCategorias,
            });
            const submissao = await client.query(`
                INSERT INTO formulario_submissoes
                    (id_usuario, id_modelo, id_setor, id_celula, assinatura, assinatura_mime, respostas, inicio_checklist, snapshot, data_envio)
                VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::jsonb, NOW()) RETURNING id
            `, [idUsuarioFinal, id_modelo, id_setor, id_celula, assinaturaImagem.buffer, assinaturaImagem.mime, JSON.stringify(respostasPersistidas), inicio_checklist || null, JSON.stringify(snapshot)]);
            for (const evidencia of evidencias) {
                await client.query(`
                    INSERT INTO formulario_evidencias
                        (id_submissao, id_pergunta, mime, tamanho, conteudo, criada_em, expira_em)
                    VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '6 months')
                `, [submissao.rows[0].id, evidencia.idPergunta, evidencia.mime, evidencia.tamanho, evidencia.conteudo]);
            }
            return submissao;
        });
        res.status(201).json({ sucesso: true, mensagem: 'Checklist salvo com sucesso.', id_relatorio: result.rows[0].id });
    } catch (error) {
        if (error instanceof ErroValidacao) return res.status(error.status).json({ sucesso: false, mensagem: error.message });
        console.error('Erro ao salvar checklist:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao salvar checklist.' });
    }
};

exports._internals = { base64ParaBuffer, base64ParaImagem, validarRespostas, validarAssinaturasCategorias, prepararRespostas, snapshotV2, RESPOSTAS_VALIDAS, idObrigatorioValido, timestampOpcionalValido };
