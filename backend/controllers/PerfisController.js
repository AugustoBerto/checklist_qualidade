const db = require('../db');
const { withTransaction } = require('../database/transaction');

const PAPEIS = new Set(['ADMIN', 'LIDER', 'INSPETOR']);
const MAX_PG_INT = 2147483647;
const ADMIN_MUTATION_LOCK_KEY = 1837465921;

const camposPerfil = `
    id, nome, matricula, papel, ativo, funcao,
    id_unidade_fk, id_setor_fk, id_celula_fk, id_turno_fk
`;

const idValido = (id) => {
    const numero = Number(id);
    return Number.isSafeInteger(numero) && numero > 0 && numero <= MAX_PG_INT
        && (typeof id === 'number' || typeof id === 'string' && /^\d+$/.test(id.trim()));
};
const bloquearMutacaoAdministrativa = (executor) => executor.query(
    'SELECT pg_advisory_xact_lock($1)',
    [ADMIN_MUTATION_LOCK_KEY]
);
const CAMPOS_FK = [
    ['id_unidade_fk', 'unidades', true],
    ['id_setor_fk', 'setores', true],
    ['id_celula_fk', 'celulas_producao', true],
    ['id_turno_fk', 'turnos', false],
];
const referenciasValidas = (dados) => CAMPOS_FK.every(([campo]) =>
    Object.prototype.hasOwnProperty.call(dados, campo)
    && (dados[campo] === null || idValido(dados[campo]))
);
const validarReferencias = async (executor, dados) => {
    if (!referenciasValidas(dados)) throw new Error('FK_INVALIDA');
    for (const [campo, tabela, ativa] of CAMPOS_FK) {
        if (dados[campo] === null) continue;
        const { rows } = await executor.query(
            `SELECT id FROM ${tabela} WHERE id = $1${ativa ? ' AND ativo = 1' : ''} FOR SHARE`,
            [Number(dados[campo])]
        );
        if (!rows.length) throw new Error('FK_INVALIDA');
    }
};
const normalizarIdFk = (id) => (id === null ? null : Number(id));

exports.me = async (req, res) => {
    res.json({ sucesso: true, perfil: req.usuario });
};

exports.listar = async (_req, res) => {
    try {
        const { rows } = await db.query(`SELECT ${camposPerfil} FROM usuarios ORDER BY nome ASC`);
        res.json({ sucesso: true, dados: rows });
    } catch (error) {
        console.error('Erro ao listar perfis:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar perfis.' });
    }
};

exports.atualizar = async (req, res) => {
    if (!idValido(req.params?.id) || !req.body || !PAPEIS.has(req.body.papel)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Papel válido é obrigatório.' });
    }

    const { papel, ativo, id_unidade_fk, id_setor_fk, id_celula_fk, id_turno_fk } = req.body;
    try {
        const { rows } = await withTransaction(db, async (client) => {
            await validarReferencias(client, req.body);
            await bloquearMutacaoAdministrativa(client);
            const perfilAtual = await client.query(
                'SELECT id, papel, ativo FROM usuarios WHERE id = $1 FOR UPDATE',
                [req.params.id]
            );
            if (!perfilAtual.rows.length) throw new Error('PERFIL_NAO_ENCONTRADO');

            const alvo = perfilAtual.rows[0];
            const novoAtivo = ativo === false || ativo === 0 ? 0 : 1;
            const removendoUltimoAdmin = alvo.papel === 'ADMIN'
                && Number(alvo.ativo) === 1
                && (papel !== 'ADMIN' || novoAtivo === 0);
            if (removendoUltimoAdmin) {
                const administradoresAtivos = await client.query(
                    "SELECT COUNT(*)::int AS total FROM usuarios WHERE papel = 'ADMIN' AND ativo = 1"
                );
                if (Number(administradoresAtivos.rows[0]?.total) <= 1) {
                    throw new Error('ULTIMO_ADMIN');
                }
            }
            return client.query(`
                UPDATE usuarios SET
                    papel = $1, ativo = $2,
                    id_unidade_fk = $3, id_setor_fk = $4, id_celula_fk = $5, id_turno_fk = $6
                WHERE id = $7
                RETURNING ${camposPerfil}
            `, [papel, novoAtivo,
                normalizarIdFk(id_unidade_fk), normalizarIdFk(id_setor_fk), normalizarIdFk(id_celula_fk), normalizarIdFk(id_turno_fk), req.params.id]);
        });
        res.json({ sucesso: true, perfil: rows[0] });
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        if (error.message === 'PERFIL_NAO_ENCONTRADO') return res.status(404).json({ sucesso: false, mensagem: 'Perfil não encontrado.' });
        if (error.message === 'ULTIMO_ADMIN') return res.status(409).json({
            sucesso: false,
            codigo: 'ULTIMO_ADMIN',
            mensagem: 'Não é possível remover ou desativar o último administrador ativo.'
        });
        if (error.message === 'FK_INVALIDA') return res.status(400).json({ sucesso: false, mensagem: 'Uma referência informada não existe ou está inativa.' });
        res.status(error.code === '23505' ? 409 : 500).json({ sucesso: false, mensagem: 'Não foi possível atualizar o perfil.' });
    }
};
