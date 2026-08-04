// db.js
require('dotenv').config()
const { Pool } = require('pg')

const schema = process.env.DB_SCHEMA || 'checklist_app'

if (!/^[a-z_][a-z0-9_]*$/.test(schema)) {
  throw new Error('DB_SCHEMA deve ser um identificador PostgreSQL válido')
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  options: `-c search_path=${schema}`,
})

module.exports = pool
