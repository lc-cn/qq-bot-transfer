import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { encryptSecret } from "../src/lib/crypto/secrets";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const user = await prisma.user.upsert({
    where: { githubId: "seed-github-1" },
    update: { name: "Seed User", email: "seed@example.com" },
    create: {
      githubId: "seed-github-1",
      name: "Seed User",
      email: "seed@example.com",
    },
  });

  await prisma.bot.upsert({
    where: { appId: "seed-app-001" },
    update: { name: "Seed Bot" },
    create: {
      userId: user.id,
      name: "Seed Bot",
      qq: "100000001",
      appId: "seed-app-001",
      secretEnc: encryptSecret("seed-client-secret"),
    },
  });

  await prisma.webhookEvent.create({
    data: {
      bot: { connect: { appId: "seed-app-001" } },
      op: 0,
      eventType: "READY",
      payload: { seeded: true, at: new Date().toISOString() },
    },
  });

  const counts = {
    users: await prisma.user.count(),
    bots: await prisma.bot.count(),
    events: await prisma.webhookEvent.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
