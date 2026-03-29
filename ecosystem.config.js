module.exports = {
  apps: [
    {
      name: 'kfc-backend',
      cwd: './backend',
      script: 'python',
      args: '-m uvicorn main:app --host 0.0.0.0 --port 8080',
      interpreter: 'none',
      watch: false,
      ignore_watch: ['node_modules', '__pycache__', '.venv', 'venv'],
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PYTHONUNBUFFERED: '1',
      },
      output: './logs/backend.log',
      error: './logs/backend-error.log',
      merge_logs: true,
    },
    {
      name: 'kfc-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'run preview',
      watch: false,
      instances: 1,
      env: {
        NODE_ENV: 'production',
      },
      output: './logs/frontend.log',
      error: './logs/frontend-error.log',
      merge_logs: true,
    },
  ],
};
