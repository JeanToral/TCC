import "dotenv/config";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "prisma", "migrations");

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id         SERIAL      PRIMARY KEY,
        name       TEXT        NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const applied = await client.query("SELECT name FROM migrations");
    const appliedNames = new Set(applied.rows.map((r) => r.name));

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    const pending = files.filter((f) => !appliedNames.has(f));

    if (pending.length === 0) {
      console.log("Nenhuma migration pendente.");
      return;
    }

    for (const file of pending) {
      const content = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
      const upMatch = content.match(
        /--\s*Up Migration\s*([\s\S]*?)(?:--\s*Down Migration|$)/i
      );

      if (!upMatch || !upMatch[1].trim()) {
        console.warn(`Aviso: ${file} não tem conteúdo em -- Up Migration. Pulando.`);
        continue;
      }

      const upSql = upMatch[1].trim();

      console.log(`Aplicando: ${file}`);
      await client.query("BEGIN");
      try {
        await client.query(upSql);
        await client.query("INSERT INTO migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`  ✓ ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`  ✗ ${file}: ${err.message}`);
        process.exit(1);
      }
    }
  } finally {
    await client.end();
  }
}

run();
