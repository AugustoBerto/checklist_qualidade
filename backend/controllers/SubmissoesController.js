const db = require('../db');
const { calcularPontuacao, agruparRespostasPorCategoria, calcularConformidade } = require('../utils/scoring');

const MAX_PG_INT = 2147483647;
const FILTRO_INVALIDO = 'FILTRO_INVALIDO';

const inteiroPositivo = (valor, campo, { max = MAX_PG_INT } = {}) => {
    const texto = typeof valor === 'string' ? valor.trim() : null;
    const valido = (typeof valor === 'number' && Number.isInteger(valor))
        || (texto !== null && /^\d+$/.test(texto));
    const numero = Number(texto === null ? valor : texto);
    if (!valido || !Number.isSafeInteger(numero) || numero <= 0 || numero > max) {
        const erro = new Error(`${campo} inválido.`);
        erro.code = FILTRO_INVALIDO;
        throw erro;
    }
    return numero;
};

const dataValida = (valor, campo) => {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        const erro = new Error(`${campo} inválida. Use o formato AAAA-MM-DD.`);
        erro.code = FILTRO_INVALIDO;
        throw erro;
    }
    const [ano, mes, dia] = valor.split('-').map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    if (ano < 1 || data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) {
        const erro = new Error(`${campo} inválida. Use uma data existente.`);
        erro.code = FILTRO_INVALIDO;
        throw erro;
    }
    return valor;
};

const textoFiltro = (valor, campo) => {
    if (valor === undefined) return null;
    if (typeof valor !== 'string') {
        const erro = new Error(`${campo} inválido.`);
        erro.code = FILTRO_INVALIDO;
        throw erro;
    }
    return valor.trim();
};

const dataUrlLegada = (valor) => {
    if (typeof valor !== 'string') return null;
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/i.exec(valor);
    if (!match) return null;
    const conteudo = Buffer.from(match[2], 'base64');
    return conteudo.length ? { mime: match[1].toLowerCase(), conteudo } : null;
};

const metadadosLegados = (respostas = []) => respostas
    .filter((item) => dataUrlLegada(item?.foto))
    .map((item, index) => {
        const foto = dataUrlLegada(item.foto);
        return {
            id: `legado-${index + 1}`,
            idPergunta: Number(item.id_pergunta),
            mime: foto.mime,
            tamanho: foto.conteudo.length,
            criadaEm: null,
            expiraEm: null,
            removidaEm: null,
            disponivel: true,
            legado: true,
        };
    });

const metadadosEvidencias = async (submissao) => {
    if (Number(submissao.snapshot?.schema) !== 2) return metadadosLegados(submissao.respostas);
    const { rows } = await db.query(`
        SELECT id AS id_evidencia, id_pergunta, mime, tamanho, criada_em, expira_em, removida_em,
            (removida_em IS NULL AND expira_em > NOW() AND conteudo IS NOT NULL) AS disponivel
        FROM formulario_evidencias
        WHERE id_submissao = $1
        ORDER BY id
    `, [submissao.id]);
    return rows.filter((row) => row.id_evidencia != null).map((row) => ({
        id: row.id_evidencia,
        idPergunta: Number(row.id_pergunta),
        mime: row.mime,
        tamanho: Number(row.tamanho),
        criadaEm: row.criada_em,
        expiraEm: row.expira_em,
        removidaEm: row.removida_em,
        disponivel: Boolean(row.disponivel),
        legado: false,
    }));
};

// Mantém a interface interna usada pelos testes/consumidores existentes;
// o cálculo agora vive no utilitário compartilhado.
const calcularConformidadeSubmissao = (respostas = [], snapshot = {}) =>
    calcularConformidade(respostas, snapshot?.perguntas);

const validarFiltros = (query = {}) => {
    const page = query.page === undefined ? 1 : Math.min(inteiroPositivo(query.page, 'Página'), 10000);
    const pageSize = query.pageSize === undefined ? 25 : Math.min(inteiroPositivo(query.pageSize, 'Tamanho da página'), 100);
    const dataInicio = query.dataInicio === undefined ? null : dataValida(query.dataInicio, 'Data inicial');
    const dataFim = query.dataFim === undefined ? null : dataValida(query.dataFim, 'Data final');
    if (dataInicio && dataFim && dataInicio > dataFim) {
        const erro = new Error('O período informado é inválido: a data inicial não pode ser posterior à data final.');
        erro.code = FILTRO_INVALIDO;
        throw erro;
    }
    return {
        page,
        pageSize,
        dataInicio,
        dataFim,
        marca: textoFiltro(query.marca, 'Marca'),
        modeloId: query.modeloId === undefined ? null : inteiroPositivo(query.modeloId, 'Modelo'),
        setorId: query.setorId === undefined ? null : inteiroPositivo(query.setorId, 'Setor'),
        celulaId: query.celulaId === undefined ? null : inteiroPositivo(query.celulaId, 'Célula'),
        busca: textoFiltro(query.busca, 'Busca'),
        usuario: textoFiltro(query.usuario, 'Usuário'),
    };
};

exports.listarSubmissoes = async (req, res) => {
    let opcoes;
    try {
        opcoes = validarFiltros(req.query || {});
    } catch (error) {
        if (error.code === FILTRO_INVALIDO) return res.status(400).json({ sucesso: false, mensagem: error.message });
        throw error;
    }
    try {
        const { page, pageSize, dataInicio, dataFim, marca, modeloId, setorId, celulaId, busca, usuario } = opcoes;
        const filtros = [];
        const valores = [];
        const adicionarFiltro = (sql, ...vals) => {
            let s = sql;
            vals.forEach(val => {
                valores.push(val);
                s = s.replace('?', `$${valores.length}`);
            });
            filtros.push(s);
        };

        if (dataInicio) adicionarFiltro('s.data_envio >= ?::date', dataInicio);
        if (dataFim) adicionarFiltro("s.data_envio < (?::date + interval '1 day')", dataFim);
        if (marca) adicionarFiltro("COALESCE(s.snapshot -> 'marca' ->> 'nome', s.snapshot -> 'modelo' ->> 'marca', ma.nome, m.marca) = ?", marca);
        if (modeloId) adicionarFiltro('s.id_modelo = ?::int', modeloId);
        if (setorId) adicionarFiltro('COALESCE(s.id_setor, st_cp.id, st_user.id) = ?::int', setorId);
        if (celulaId) adicionarFiltro('s.id_celula = ?::int', celulaId);
        if (busca) {
            const termo = `%${busca}%`;
            adicionarFiltro(
                "(COALESCE(s.snapshot -> 'auditor' ->> 'nome', u.nome) ILIKE ? OR COALESCE(s.snapshot -> 'modelo' ->> 'nome', m.nome) ILIKE ? OR COALESCE(s.snapshot -> 'celula' ->> 'nome', cp.nome) ILIKE ? OR COALESCE(s.snapshot -> 'setor' ->> 'nome', st_sub.nome, st_cp.nome, st_user.nome) ILIKE ?)",
                termo, termo, termo, termo
            );
        } else if (usuario) {
            adicionarFiltro("COALESCE(s.snapshot -> 'auditor' ->> 'nome', u.nome) ILIKE ?", `%${usuario}%`);
        }

        const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
        const joins = `FROM formulario_submissoes s LEFT JOIN usuarios u ON s.id_usuario = u.id LEFT JOIN modelo m ON s.id_modelo = m.id LEFT JOIN marcas ma ON ma.id = m.id_marca_fk LEFT JOIN celulas_producao cp ON s.id_celula = cp.id LEFT JOIN setores st_sub ON s.id_setor = st_sub.id LEFT JOIN setores st_cp ON cp.id_setor_fk = st_cp.id LEFT JOIN setores st_user ON u.id_setor_fk = st_user.id`;
        const sql = `SELECT s.id, s.data_envio, s.respostas, s.snapshot, COALESCE(s.snapshot -> 'auditor' ->> 'nome', u.nome, 'Não informado') AS nome_usuario, COALESCE(s.snapshot -> 'modelo' ->> 'nome', m.nome, 'Não informado') AS nome_modelo, COALESCE(s.snapshot -> 'celula' ->> 'nome', cp.nome, 'Não informada') AS nome_celula, COALESCE(s.snapshot -> 'setor' ->> 'nome', st_sub.nome, st_cp.nome, st_user.nome, 'Geral') AS nome_setor ${joins} ${where} ORDER BY s.data_envio DESC`;
        const [totalResult, resultado] = await Promise.all([
            db.query(`SELECT count(*) ${joins} ${where}`, valores),
            db.query(`${sql} LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}`, [...valores, pageSize, (page - 1) * pageSize]),
        ]);
        const total = Number(totalResult.rows[0].count);
        const dados = resultado.rows.map(({ respostas, snapshot, ...submissao }) => ({
            ...submissao,
            pontuacao: calcularConformidade(respostas, snapshot?.perguntas),
        }));
        res.json({ sucesso: true, dados, paginacao: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
    } catch (error) {
        console.error('Erro ao listar submissões:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao listar submissões.' });
    }
};

exports.buscarDetalhesSubmissao = async (req, res) => {
    let id;
    try {
        id = inteiroPositivo(req.params.id, 'ID de relatório');
    } catch (error) {
        if (error.code === FILTRO_INVALIDO) return res.status(400).json({ sucesso: false, mensagem: error.message });
        throw error;
    }
    try {
        const { rows } = await db.query(`
            SELECT s.id, s.data_envio, s.inicio_checklist, s.assinatura, s.assinatura_mime,
                s.respostas, s.snapshot, s.id_modelo, s.id_setor, s.id_celula,
                u.nome AS nome_usuario, u.matricula AS matricula_usuario,
                u.funcao AS funcao_usuario, un.nome AS nome_unidade, m.nome AS nome_modelo,
                cp.nome AS nome_celula, st.nome AS nome_setor
            FROM formulario_submissoes s
            LEFT JOIN usuarios u ON s.id_usuario = u.id
            LEFT JOIN unidades un ON un.id = u.id_unidade_fk
            LEFT JOIN modelo m ON s.id_modelo = m.id
            LEFT JOIN celulas_producao cp ON s.id_celula = cp.id
            LEFT JOIN setores st ON s.id_setor = st.id
            WHERE s.id = $1
        `, [id]);
        if (!rows.length) return res.status(404).json({ sucesso: false, mensagem: 'Relatório não encontrado.' });
        const submissao = rows[0];
        const perguntas = new Map();
        if (submissao.snapshot?.perguntas) {
            submissao.snapshot.perguntas.forEach((pergunta) => perguntas.set(Number(pergunta.id), pergunta));
        } else {
            const legado = await db.query(`SELECT p.id, p.pergunta, c.categoria FROM perguntas p LEFT JOIN categorias c ON c.id = p.id_categoria WHERE p.id_modelo = $1`, [submissao.id_modelo]);
            legado.rows.forEach((pergunta) => perguntas.set(Number(pergunta.id), { ...pergunta, categoria: pergunta.categoria || 'Geral' }));
        }
        const evidencias = await metadadosEvidencias(submissao);
        const evidenciasDetalhadas = evidencias.map((item) => ({
            ...item,
            pergunta: perguntas.get(item.idPergunta)?.pergunta || null,
        }));
        const snapshot = submissao.snapshot || {};
        const auditor = snapshot.auditor || {};
        const dados = {
            id: submissao.id,
            nomeUsuario: auditor.nome || submissao.nome_usuario || 'Não informado',
            matriculaUsuario: auditor.matricula || submissao.matricula_usuario || null,
            funcaoUsuario: auditor.funcao || submissao.funcao_usuario || null,
            nomeModelo: snapshot.modelo?.nome || submissao.nome_modelo || 'Não informado',
            marca: snapshot.marca?.nome || snapshot.modelo?.marca || null,
            nomeSetor: snapshot.setor?.nome || submissao.nome_setor || 'Não informado',
            nomeCelula: snapshot.celula?.nome || submissao.nome_celula || 'Não informada',
            unidade: snapshot.unidade?.nome || submissao.nome_unidade || null,
            dataInicio: snapshot.inicio || submissao.inicio_checklist || null,
            dataEnvio: submissao.data_envio,
            assinatura: submissao.assinatura ? `data:${submissao.assinatura_mime || 'image/png'};base64,${submissao.assinatura.toString('base64')}` : null,
            assinaturasCategorias: snapshot.assinaturas_categorias || {},
            categorias: Object.create(null),
            evidencias: {
                total: Number.isInteger(snapshot.evidencias?.total) ? snapshot.evidencias.total : evidencias.length,
                disponiveis: evidenciasDetalhadas.filter((item) => item.disponivel).length,
                itens: evidenciasDetalhadas,
            },
            pontuacao: 0,
        };
        const paraPontuar = agruparRespostasPorCategoria(submissao.respostas, perguntas);
        submissao.respostas.forEach((resposta) => {
            const pergunta = perguntas.get(Number(resposta.id_pergunta));
            const categoria = pergunta?.categoria || 'Geral';
            const evidencia = evidenciasDetalhadas.find((item) => item.idPergunta === Number(resposta.id_pergunta));
            (dados.categorias[categoria] ||= []).push({
                idPergunta: Number(resposta.id_pergunta),
                pergunta: pergunta?.pergunta || 'Item removido/descontinuado',
                resposta: resposta.resposta,
                observacao: resposta.observacao,
                evidencia: evidencia ? { id: evidencia.id, disponivel: evidencia.disponivel } : null,
            });
        });
        const { total_C, total_NC, total_NP, total_NA } = calcularPontuacao(paraPontuar);
        const total = total_C + total_NC + total_NP + total_NA;
        dados.pontuacao = total ? Math.round(((total_C + total_NA) / total) * 100) : 100;
        res.json({ sucesso: true, dados });
    } catch (error) {
        console.error('Erro ao buscar detalhes da submissão:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao processar detalhes da consulta.' });
    }
};

exports.listarEvidenciasSubmissao = async (req, res) => {
    let id;
    try {
        id = inteiroPositivo(req.params.id, 'ID de relatório');
    } catch (error) {
        if (error.code === FILTRO_INVALIDO) return res.status(400).json({ sucesso: false, mensagem: error.message });
        throw error;
    }
    try {
        const { rows } = await db.query(
            'SELECT id, data_envio, respostas, snapshot FROM formulario_submissoes WHERE id = $1',
            [id]
        );
        if (!rows.length) return res.status(404).json({ sucesso: false, mensagem: 'Relatório não encontrado.' });
        const evidencias = await metadadosEvidencias(rows[0]);
        const total = Number.isInteger(rows[0].snapshot?.evidencias?.total)
            ? rows[0].snapshot.evidencias.total
            : evidencias.length;
        return res.json({ sucesso: true, dados: { total, evidencias } });
    } catch (error) {
        console.error('Erro ao listar evidências da submissão:', error);
        return res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao listar evidências.' });
    }
};

exports.baixarEvidenciaSubmissao = async (req, res) => {
    let id;
    try {
        id = inteiroPositivo(req.params.id, 'ID de relatório');
    } catch (error) {
        if (error.code === FILTRO_INVALIDO) return res.status(400).json({ sucesso: false, mensagem: error.message });
        throw error;
    }
    const evidenciaId = String(req.params.evidenciaId || '');
    let evidenciaNumero = null;
    let indiceLegado = null;
    try {
        if (/^\d+$/.test(evidenciaId)) evidenciaNumero = inteiroPositivo(evidenciaId, 'ID de evidência');
        else {
            const legado = /^legado-(\d+)$/.exec(evidenciaId);
            if (!legado) throw Object.assign(new Error('ID de evidência inválido.'), { code: FILTRO_INVALIDO });
            indiceLegado = inteiroPositivo(legado[1], 'ID de evidência legada');
        }
    } catch (error) {
        if (error.code === FILTRO_INVALIDO) return res.status(400).json({ sucesso: false, mensagem: error.message });
        throw error;
    }
    try {
        if (evidenciaNumero !== null) {
            const { rows } = await db.query(`
                SELECT mime, tamanho, conteudo, expira_em, removida_em,
                    (removida_em IS NULL AND expira_em > NOW() AND conteudo IS NOT NULL) AS disponivel
                FROM formulario_evidencias
                WHERE id = $1 AND id_submissao = $2
            `, [evidenciaNumero, id]);
            if (!rows.length) return res.status(404).json({ sucesso: false, mensagem: 'Evidência não encontrada.' });
            const evidencia = rows[0];
            if (!evidencia.disponivel) {
                return res.status(410).json({ sucesso: false, codigo: 'EVIDENCIA_EXPIRADA', mensagem: 'Esta evidência não está mais disponível.' });
            }
            res.set({
                'Content-Type': evidencia.mime,
                'Content-Length': String(evidencia.tamanho),
                'Content-Disposition': `inline; filename="evidencia-${evidenciaId}.${evidencia.mime.split('/')[1]}"`,
                'Cache-Control': 'private, max-age=300',
            });
            return res.send(evidencia.conteudo);
        }

        const { rows } = await db.query('SELECT respostas FROM formulario_submissoes WHERE id = $1', [id]);
        if (!rows.length) return res.status(404).json({ sucesso: false, mensagem: 'Relatório não encontrado.' });
        const fotos = (rows[0].respostas || []).filter((item) => dataUrlLegada(item?.foto));
        const foto = fotos[indiceLegado - 1] && dataUrlLegada(fotos[indiceLegado - 1].foto);
        if (!foto) return res.status(404).json({ sucesso: false, mensagem: 'Evidência não encontrada.' });
        res.set({
            'Content-Type': foto.mime,
            'Content-Length': String(foto.conteudo.length),
            'Content-Disposition': `inline; filename="evidencia-${evidenciaId}.${foto.mime.split('/')[1]}"`,
            'Cache-Control': 'private, max-age=300',
        });
        return res.send(foto.conteudo);
    } catch (error) {
        console.error('Erro ao baixar evidência da submissão:', error);
        return res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao buscar evidência.' });
    }
};

exports._internals = { inteiroPositivo, dataValida, validarFiltros, calcularConformidadeSubmissao };
