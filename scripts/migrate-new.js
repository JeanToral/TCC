import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "prisma", "migrations");

const name = process.argv[2];

if (!name) {
  console.error("Erro: informe o nome da migration.");
  console.error("  Uso: pnpm migrate:new <nome>");
  console.error("  Ex:  pnpm migrate:new add-assets");
  process.exit(1);
}

const timestamp = new Date()
  .toISOString()
  .replace(/[-T:.Z]/g, "")
  .slice(0, 14);

const filename = `${timestamp}-${name}.sql`;
const filepath = join(MIGRATIONS_DIR, filename);

const template = `-- Up Migration


-- Down Migration

`;

mkdirSync(MIGRATIONS_DIR, { recursive: true });
writeFileSync(filepath, template, "utf8");

console.log(`Migration criada: prisma/migrations/${filename}`);
