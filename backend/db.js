require('dotenv').config();
const { Pool } = require('pg');

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

const createDbConfig = (env = process.env) => {
  const schema = env.DB_SCHEMA || 'checklist_app';
  if (!IDENTIFIER.test(schema)) throw new Error('DB_SCHEMA deve ser um identificador PostgreSQL válido');
  if (!env.DATABASE_URL?.trim()) throw new Error('DATABASE_URL é obrigatória para conectar ao PostgreSQL');

  return {
    connectionString: env.DATABASE_URL,
    options: `-c search_path=${schema}`,
    max: env.DB_POOL_MAX ? Number(env.DB_POOL_MAX) : undefined,
  };
};

const createPool = (env = process.env) => new Pool(createDbConfig(env));
const registrarErroPool = (pool, logger = console) => {
  pool.on('error', (error) => logger.error(`Erro assíncrono do pool PostgreSQL: ${error.message}`));
  return pool;
};
const pool = registrarErroPool(createPool());

// Preserve the existing `require('./db').query/connect` contract while making
// the factory available to the migration runner and integration tests.
pool.createPool = createPool;
pool.createDbConfig = createDbConfig;

module.exports = pool;
module.exports.createPool = createPool;
module.exports.createDbConfig = createDbConfig;
module.exports.registrarErroPool = registrarErroPool;
