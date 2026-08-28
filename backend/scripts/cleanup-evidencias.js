const db = require('../db');

async function limparEvidenciasExpiradas(client = db) {
    const result = await client.query(`
        UPDATE formulario_evidencias
        SET conteudo = NULL, removida_em = COALESCE(removida_em, NOW())
        WHERE expira_em <= NOW() AND conteudo IS NOT NULL
    `);
    return result.rowCount;
}

async function main() {
    try {
        const removidas = await limparEvidenciasExpiradas();
        console.log(JSON.stringify({ sucesso: true, evidenciasRemovidas: removidas }));
    } catch (error) {
        console.error(`Falha ao limpar evidências expiradas: ${error.message}`);
        process.exitCode = 1;
    } finally {
        await db.end();
    }
}

if (require.main === module) void main();

module.exports = { limparEvidenciasExpiradas };
