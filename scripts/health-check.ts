#!/usr/bin/env node
/**
 * Health check — verifies all required env vars are present
 * and each package's dist/index.js exists.
 * Run: npx tsx scripts/health-check.ts
 */
import { existsSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env") });

const SERVERS = [
  {
    name: "asana-mcp",
    envVars: ["ASANA_API_TOKEN"],
    dist: "packages/asana-mcp/dist/index.js",
  },
  {
    name: "github-mcp",
    envVars: ["GITHUB_TOKEN", "GITHUB_USER"],
    dist: "packages/github-mcp/dist/index.js",
  },
  {
    name: "confluence-mcp",
    envVars: ["CONFLUENCE_API_KEY", "CONFLUENCE_BASE_URL", "CONFLUENCE_EMAIL"],
    dist: "packages/confluence-mcp/dist/index.js",
  },
  {
    name: "supabase-mcp",
    envVars: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    dist: "packages/supabase-mcp/dist/index.js",
  },
  {
    name: "neo4j-mcp",
    envVars: ["NEO4J_URI", "NEO4J_PASSWORD"],
    dist: "packages/neo4j-mcp/dist/index.js",
  },
];

let allOk = true;

console.log("\n╔══════════════════════════════════════════════╗");
console.log("║     glaciereq-mcp-stack health check         ║");
console.log("╚══════════════════════════════════════════════╝\n");

for (const server of SERVERS) {
  const missingEnv = server.envVars.filter((v) => !process.env[v]);
  const distExists = existsSync(resolve(process.cwd(), server.dist));

  const envStatus = missingEnv.length === 0 ? "✅ env" : `❌ env missing: ${missingEnv.join(", ")}`;
  const distStatus = distExists ? "✅ built" : "⚠️  not built (run npm run build)";

  console.log(`  ${server.name}`);
  console.log(`    ${envStatus}`);
  console.log(`    ${distStatus}`);
  console.log();

  if (missingEnv.length > 0) allOk = false;
}

if (allOk) {
  console.log("✅ All systems ready. Run: npm run start:all\n");
  process.exit(0);
} else {
  console.log("❌ Fix missing env vars in .env before starting.\n");
  process.exit(1);
}
