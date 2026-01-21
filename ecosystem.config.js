module.exports = {
  apps: [
    {
      name: 'app',
      script: 'dist/main.js',
      max_memory_restart: '3G',

      // env_file: '.env',           //uncomment Force pm2 to read env variables from .env file
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
