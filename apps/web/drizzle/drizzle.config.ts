import { defineConfig } from "drizzle-kit";

// Migrations for the family record (src/lib/server/db/schema.ts). Run from apps/web:
//   npx drizzle-kit generate --config drizzle/drizzle.config.ts   after a schema change
//   npx drizzle-kit migrate  --config drizzle/drizzle.config.ts   against DATABASE_URL
// The server also applies pending migrations itself on first use (src/lib/server/db/client.ts).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
});
