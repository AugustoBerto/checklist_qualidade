const { spawnSync } = require('node:child_process');
const path = require('node:path');

const backendDir = path.resolve(__dirname, '..');
const database = process.env.DB_TEST_DATABASE || 'checklist_test';

if (!database.endsWith('_test')) {
  throw new Error('DB_TEST_DATABASE deve terminar com _test para executar testes destrutivos.');
}

const env = {
  ...process.env,
  DB_HOST: process.env.DB_TEST_HOST || '127.0.0.1',
  DB_PORT: process.env.DB_TEST_PORT || '55432',
  DB_USER: process.env.DB_TEST_USER || 'checklist_test',
  DB_PASSWORD: process.env.DB_TEST_PASSWORD || 'checklist_test_only',
  DB_DATABASE: database,
  DB_SCHEMA: process.env.DB_TEST_SCHEMA || 'checklist_app',
  RUN_DB_INTEGRATION: '1'
};

const compose = ['compose', '-p', 'checklistapp-db-test', '-f', 'docker-compose.db-test.yml'];
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { cwd: backendDir, env, stdio: 'inherit', shell: false, ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} encerrou com código ${result.status}.`);
};

let started = false;
try {
  started = true;
  run('docker', [...compose, 'up', '-d', '--wait']);
  run(process.execPath, ['scripts/db.js', 'init']);
  run(process.execPath, ['scripts/db.js', 'migrate']);
  run(process.execPath, ['--test', '--test-concurrency=1', 'test/integration/database.integration.test.js']);
} finally {
  if (started) run('docker', [...compose, 'down', '-v', '--remove-orphans']);
}
