import "dotenv/config";
import { readFileSync } from "fs";
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
    const result = await client.query(
      "SELECT name FROM migrations ORDER BY applied_at DESC LIMIT 1"
    );

    if (result.rows.length === 0) {
      console.log("Nenhuma migration aplicada para reverter.");
      return;
    }

    const { name: file } = result.rows[0];
    const content = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    const downMatch = content.match(/--\s*Down Migration\s*([\s\S]*?)$/i);

    if (!downMatch || !downMatch[1].trim()) {
      console.error(`Erro: ${file} não tem conteúdo em -- Down Migration.`);
      process.exit(1);
    }

    const downSql = downMatch[1].trim();

    console.log(`Revertendo: ${file}`);
    await client.query("BEGIN");
    try {
      await client.query(downSql);
      await client.query("DELETE FROM migrations WHERE name = $1", [file]);
      await client.query("COMMIT");
      console.log(`  ✓ ${file} revertida`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`  ✗ ${file}: ${err.message}`);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

run();
