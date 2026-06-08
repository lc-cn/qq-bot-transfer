import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const count = await prisma.user.count();
  console.log(`✅ Connected (${count} user(s) in database)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
