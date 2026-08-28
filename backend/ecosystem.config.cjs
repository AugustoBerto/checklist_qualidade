module.exports = {
  apps: [
    {
      name: 'checklist-api',
      cwd: __dirname,
      script: './index.js',

      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      time: true,
      max_memory_restart: '1G',
    },
  ],
}
