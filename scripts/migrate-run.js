import "dotenv/config";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "prisma", "migrations");

// Até esta migration, a produção (Railway) era mantida por `prisma db push`, que
// não registra nada em "migrations". Ver baselineLegacyDatabase.
const BASELINE_UNTIL = "20260927000000-add-cost-model.sql";

/**
 * Banco criado pelo db push: tem as tabelas, mas não a tabela "migrations".
 * Registra como aplicadas as migrations até BASELINE_UNTIL (o schema delas já
 * existe) para que só as posteriores rodem. Banco vazio ou já controlado por
 * "migrations" não é tocado.
 */
async function baselineLegacyDatabase(client, files) {
  const { rows } = await client.query(
    `SELECT to_regclass('public.migrations') AS migrations, to_regclass('public."User"') AS users`
  );
  if (rows[0].migrations !== null || rows[0].users === null) return;

  const baseline = files.filter((f) => f <= BASELINE_UNTIL);
  console.log(`Banco legado (db push) sem controle de migrations: baseline de ${baseline.length} migrations até ${BASELINE_UNTIL}.`);

  await client.query("BEGIN");
  try {
    await createMigrationsTable(client);
    for (const file of baseline) {
      await client.query("INSERT INTO migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING", [file]);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}

function createMigrationsTable(client) {
  return client.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id         SERIAL      PRIMARY KEY,
      name       TEXT        NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    await baselineLegacyDatabase(client, files);
    await createMigrationsTable(client);

    const applied = await client.query("SELECT name FROM migrations");
    const appliedNames = new Set(applied.rows.map((r) => r.name));

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
