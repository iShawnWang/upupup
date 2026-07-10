module.exports = {
  apps: [
    {
      name: 'upupup-web',
      script: 'node_modules/.bin/next',
      args: 'start',
      interpreter: 'bash',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOST: '0.0.0.0'
      }
    },
    {
      name: 'upupup-worker',
      script: 'dist-worker/worker.js',
      interpreter: 'node',
      node_args: '--env-file=.env',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}
