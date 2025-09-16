import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon with better WebSocket handling
neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = true;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create pool with improved configuration
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 5, // Reduce max connections to avoid limits
  idleTimeoutMillis: 30000, // 30 seconds idle timeout
  connectionTimeoutMillis: 10000, // 10 seconds connection timeout
  allowExitOnIdle: true, // Allow pool to exit when idle
});

export const db = drizzle({ client: pool, schema });