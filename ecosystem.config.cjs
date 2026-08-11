const path = require('path')

module.exports = {
  apps: [
    {
      name: 'checklist-api',
      cwd: path.join(__dirname, 'backend'),
      script: 'index.js',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'development',
        HOST: 'localhost',
        PORT: 7733,
      },
      env_production: {
        NODE_ENV: 'production',
        HOST: '0.0.0.0',
        PORT: 7733,
      },
    },
  ],
}
