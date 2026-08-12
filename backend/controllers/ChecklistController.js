const db = require('../db');

const RESPOSTAS_VALIDAS = new Set(['Conforme', 'Não Conforme', 'N/A']);
const MAX_FOTO_BYTES = 2 * 1024 * 1024;
const MAX_ASSINATURA_BYTES = 1024 * 1024;

class ErroValidacao extends Error {
    constructor(mensagem, status = 400) {
        super(mensagem);
        this.status = status;
    }
}

const base64ParaBuffer = (valor, limite, campo) => {
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
    return buffer;
};

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
            base64ParaBuffer(item.foto, MAX_FOTO_BYTES, 'A foto da não conformidade');
            if (typeof item.observacao !== 'string' || !item.observacao.trim()) {
                throw new ErroValidacao('A observação é obrigatória para itens não conformes.');
            }
        } else if (item.foto != null) {
            base64ParaBuffer(item.foto, MAX_FOTO_BYTES, 'A foto');
        }
    }
};

const idOpcionalValido = (id) => id == null || id === '' || (Number.isInteger(Number(id)) && Number(id) > 0);

exports.buscarPerguntas = async (req, res) => {
    const modeloId = Number(req.params.modelo);
    if (!Number.isInteger(modeloId)) return res.status(400).json({ sucesso: false, mensagem: 'Modelo inválido.' });
    try {
        const { rows } = await db.query(`
            SELECT p.id AS id_pergunta, c.id AS id_categoria, c.categoria, c.ctq,
                p.pergunta, p.identificacao, m.nome AS nome_modelo, m.id AS id_modelo_fk
            FROM perguntas p
            JOIN modelo m ON p.id_modelo = m.id
            JOIN categorias c ON p.id_categoria = c.id
            WHERE p.id_modelo = $1 AND p.ativo = 1 AND m.ativo = true
            ORDER BY c.id, p.id
        `, [modeloId]);
        if (!rows.length) return res.status(404).json({ sucesso: false, mensagem: 'Modelo ativo sem perguntas não encontrado.' });
        const agrupado = {};
        rows.forEach((row) => {
            const categoria = row.categoria || 'SEM CATEGORIA';
            (agrupado[categoria] ||= []).push({ id: row.id_pergunta, texto: row.pergunta, variavel: row.identificacao, modelo: row.nome_modelo, id_modelo: row.id_modelo_fk, ctq: row.ctq || false });
        });
        res.json({ sucesso: true, respostasAgrupadas: agrupado });
    } catch (err) {
        console.error('Erro ao buscar perguntas:', err);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao buscar perguntas.' });
    }
};

exports.salvarChecklist = async (req, res) => {
    const { id_modelo, id_setor, id_celula, assinatura, respostas, inicio_checklist } = req.body;
    const idUsuarioFinal = req.usuario?.id;
    if (!idUsuarioFinal || !Number.isInteger(Number(id_modelo))) {
        return res.status(400).json({ sucesso: false, mensagem: 'Dados incompletos ou inválidos.' });
    }
    if (!idOpcionalValido(id_setor) || !idOpcionalValido(id_celula)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Setor ou célula inválidos.' });
    }
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const modeloRes = await client.query('SELECT id, nome, marca FROM modelo WHERE id = $1 AND ativo = true FOR SHARE', [id_modelo]);
        if (!modeloRes.rows.length) throw new ErroValidacao('Modelo inválido ou inativo.');
        const perguntasRes = await client.query(`
            SELECT p.id, p.pergunta, p.identificacao, c.categoria, c.ctq
            FROM perguntas p JOIN categorias c ON c.id = p.id_categoria
            WHERE p.id_modelo = $1 AND p.ativo = 1 ORDER BY c.id, p.id FOR SHARE
        `, [id_modelo]);
        if (!perguntasRes.rows.length) throw new ErroValidacao('O modelo não possui perguntas ativas.');
        validarRespostas(respostas, perguntasRes.rows);
        const assinaturaBuffer = base64ParaBuffer(assinatura, MAX_ASSINATURA_BYTES, 'A assinatura');
        const snapshot = { modelo: modeloRes.rows[0], perguntas: perguntasRes.rows.map(({ id, pergunta, identificacao, categoria, ctq }) => ({ id, pergunta, identificacao, categoria, ctq })) };
        const result = await client.query(`
            INSERT INTO formulario_submissoes
                (id_usuario, id_modelo, id_setor, id_celula, assinatura, respostas, inicio_checklist, snapshot, data_envio)
            VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb, NOW()) RETURNING id
        `, [idUsuarioFinal, id_modelo, id_setor || null, id_celula || null, assinaturaBuffer, JSON.stringify(respostas), inicio_checklist || null, JSON.stringify(snapshot)]);
        await client.query('COMMIT');
        res.status(201).json({ sucesso: true, mensagem: 'Checklist salvo com sucesso.', id_relatorio: result.rows[0].id });
    } catch (error) {
        await client.query('ROLLBACK');
        if (error instanceof ErroValidacao) return res.status(error.status).json({ sucesso: false, mensagem: error.message });
        console.error('Erro ao salvar checklist:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao salvar checklist.' });
    } finally { client.release(); }
};

exports._internals = { base64ParaBuffer, validarRespostas, RESPOSTAS_VALIDAS, idOpcionalValido };
