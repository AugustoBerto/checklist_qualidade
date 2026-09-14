// Resolve as categorias legadas em lote, preservando as perguntas do snapshot.
async function perguntasSubmissoes(submissoes, executor) {
    const modelos = [...new Set(submissoes
        .filter((s) => !s.snapshot?.perguntas)
        .map((s) => s.id_modelo))];
    const porModelo = new Map();
    if (modelos.length) {
        const { rows } = await executor.query(`
            SELECT p.id, p.id_modelo, p.pergunta, c.categoria, c.ctq
            FROM perguntas p LEFT JOIN categorias c ON c.id = p.id_categoria
            WHERE p.id_modelo = ANY($1::int[])
            ORDER BY c.ordem, c.id, p.id
        `, [modelos]);
        for (const pergunta of rows) {
            const id = Number(pergunta.id_modelo);
            if (!porModelo.has(id)) porModelo.set(id, []);
            porModelo.get(id).push(pergunta);
        }
    }
    return submissoes.map((s) => s.snapshot?.perguntas || porModelo.get(Number(s.id_modelo)) || []);
}

module.exports = { perguntasSubmissoes };
