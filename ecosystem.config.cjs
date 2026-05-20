/** 可选：非 1Panel 机器自用 PM2；1Panel 请用「运行环境」+ scripts/1panel-start.sh */
module.exports = {
  apps: [
    {
      name: "qq-bot-transfer",
      cwd: __dirname,
      script: "node_modules/.bin/tsx",
      args: "server.ts",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
        HOSTNAME: "0.0.0.0",
      },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
    },
  ],
};
