import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for serverless environment with connection limits
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;
neonConfig.pipelineTLS = false;
neonConfig.fetchConnectionCache = false;
neonConfig.poolQueryViaFetch = true;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create pool with simplified settings to avoid timeout issues
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle: false,
});

// Handle pool errors gracefully
pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

export const db = drizzle({ client: pool, schema });