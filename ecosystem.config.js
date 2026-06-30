module.exports = {
  apps: [{
    name: 'upupup',
    script: 'node_modules/.bin/next',
    args: 'start',
    interpreter: 'bash',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      HOST: '0.0.0.0'
    }
  }]
}
