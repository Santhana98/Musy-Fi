const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.log('Usage: node reset-password.js <email> <new-password>');
    process.exit(1);
  }

  try {
    const hashedPassword = hashPassword(newPassword);
    const user = await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });
    console.log(`\x1b[32mSuccessfully updated password for ${user.email}\x1b[0m`);
  } catch (error) {
    console.error('\x1b[31mError updating password:\x1b[0m User not found or database error.');
  } finally {
    await prisma.$disconnect();
  }
}

main();
