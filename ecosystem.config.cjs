/**
 * PM2 ecosystem config — production process manager.
 * Usage: pm2 start ecosystem.config.cjs
 * Requires: npm run build first
 */
module.exports = {
  apps: [
    {
      name: "asana-mcp",
      script: "packages/asana-mcp/dist/index.js",
      interpreter: "node",
      env_file: ".env",
      restart_delay: 3000,
      max_restarts: 10,
      autorestart: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      out_file: "logs/asana-mcp.out.log",
      error_file: "logs/asana-mcp.err.log",
    },
    {
      name: "github-mcp",
      script: "packages/github-mcp/dist/index.js",
      interpreter: "node",
      env_file: ".env",
      restart_delay: 3000,
      max_restarts: 10,
      autorestart: true,
      out_file: "logs/github-mcp.out.log",
      error_file: "logs/github-mcp.err.log",
    },
    {
      name: "confluence-mcp",
      script: "packages/confluence-mcp/dist/index.js",
      interpreter: "node",
      env_file: ".env",
      restart_delay: 3000,
      max_restarts: 10,
      autorestart: true,
      out_file: "logs/confluence-mcp.out.log",
      error_file: "logs/confluence-mcp.err.log",
    },
    {
      name: "supabase-mcp",
      script: "packages/supabase-mcp/dist/index.js",
      interpreter: "node",
      env_file: ".env",
      restart_delay: 3000,
      max_restarts: 10,
      autorestart: true,
      out_file: "logs/supabase-mcp.out.log",
      error_file: "logs/supabase-mcp.err.log",
    },
    {
      name: "neo4j-mcp",
      script: "packages/neo4j-mcp/dist/index.js",
      interpreter: "node",
      env_file: ".env",
      restart_delay: 3000,
      max_restarts: 10,
      autorestart: true,
      out_file: "logs/neo4j-mcp.out.log",
      error_file: "logs/neo4j-mcp.err.log",
    },
  ],
};
