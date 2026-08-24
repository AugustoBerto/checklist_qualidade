/**
 * Runs a unit of work in a PostgreSQL transaction. Keeping this boundary in a
 * small helper lets repositories and tests inject a pool/client executor
 * without placing transaction SQL in controllers.
 */
const withTransaction = async (executor, work) => {
    const client = await executor.connect();
    try {
        await client.query('BEGIN');
        const result = await work(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch (_rollbackError) {
            // Preserve the business/query error for the existing controller
            // status envelope while still releasing the connection below.
        }
        throw error;
    } finally {
        client.release();
    }
};

module.exports = { withTransaction };
