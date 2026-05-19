import * as bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

async function main() {
  const password = process.argv[2];

  if (!password) {
    console.error('Uso: npx ts-node scripts/hash-password.ts <senha>');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);

  console.log('\nHash gerado:');
  console.log(hash);
  console.log('\nSQL para atualizar o usuário:');
  console.log(`UPDATE "User" SET "passwordHash" = '${hash}' WHERE email = 'email@exemplo.com';`);
}

main();
