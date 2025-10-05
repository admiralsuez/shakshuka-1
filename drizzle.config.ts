import 'dotenv/config';
import type { Config } from 'drizzle-kit';

const cfg = {
  schema: './src/db/schema.ts',
  out: './drizzle',
  // remove `dialect` if your drizzle-kit types don't allow it
  dbCredentials: {
    // prefer `token` for Turso, not `authToken`
    url: process.env.TURSO_CONNECTION_URL!,
    token: process.env.TURSO_TOKEN!,
  },
} as unknown as Config; // cast avoids mismatched minor-typing issues

export default cfg;