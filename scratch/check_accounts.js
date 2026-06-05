const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
    if (match) {
      let key = match[1].trim();
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      process.env[key] = val;
    }
  });
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const accounts = await prisma.account.findMany();
    console.log("=== ACCOUNTS ===");
    for (const a of accounts) {
      console.log(`Account ID: ${a.id}, User ID: ${a.userId}, Provider: ${a.provider}, Has Refresh Token: ${!!a.refresh_token}`);
    }
  } catch (err) {
    console.error("Failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
