require('dotenv').config();
const { Pool } = require('pg');

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

const createDbConfig = (env = process.env) => {
  const schema = env.DB_SCHEMA || 'checklist_app';
  if (!IDENTIFIER.test(schema)) throw new Error('DB_SCHEMA deve ser um identificador PostgreSQL válido');

  const config = env.DATABASE_URL
    ? { connectionString: env.DATABASE_URL }
    : {
        host: env.DB_HOST,
        port: env.DB_PORT,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_DATABASE,
      };

  return {
    ...config,
    options: `-c search_path=${schema}`,
    max: env.DB_POOL_MAX ? Number(env.DB_POOL_MAX) : undefined,
  };
};

const createPool = (env = process.env) => new Pool(createDbConfig(env));
const pool = createPool();

// Preserve the existing `require('./db').query/connect` contract while making
// the factory available to the migration runner and integration tests.
pool.createPool = createPool;
pool.createDbConfig = createDbConfig;

module.exports = pool;
module.exports.createPool = createPool;
module.exports.createDbConfig = createDbConfig;
