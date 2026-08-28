const test = require('node:test');
const assert = require('node:assert/strict');
const { limparEvidenciasExpiradas } = require('../scripts/cleanup-evidencias');

test('limpeza remove somente o conteúdo de evidências expiradas e preserva o registro', async () => {
    let consulta;
    const client = {
        async query(sql) {
            consulta = sql;
            return { rowCount: 3 };
        },
    };

    const removidas = await limparEvidenciasExpiradas(client);

    assert.equal(removidas, 3);
    assert.match(consulta, /UPDATE formulario_evidencias/);
    assert.match(consulta, /SET conteudo = NULL, removida_em = COALESCE\(removida_em, NOW\(\)\)/);
    assert.match(consulta, /WHERE expira_em <= NOW\(\) AND conteudo IS NOT NULL/);
    assert.doesNotMatch(consulta, /DELETE FROM/);
});
