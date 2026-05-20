import { prisma } from "@/lib/db";

export async function persistWebhookEvent(
  botId: string,
  payload: { op: number; t?: string; d: unknown },
): Promise<void> {
  await prisma.webhookEvent.create({
    data: {
      botId,
      op: payload.op,
      eventType: payload.t ?? null,
      payload: payload as object,
    },
  });

  const maxPerBot = parseInt(
    process.env.WEBHOOK_EVENT_MAX_PER_BOT ?? "5000",
    10,
  );
  const retentionDays = parseInt(
    process.env.WEBHOOK_EVENT_RETENTION_DAYS ?? "30",
    10,
  );

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  void prisma.webhookEvent
    .deleteMany({
      where: { botId, receivedAt: { lt: cutoff } },
    })
    .catch(console.error);

  const count = await prisma.webhookEvent.count({ where: { botId } });
  if (count > maxPerBot) {
    const excess = count - maxPerBot;
    const oldest = await prisma.webhookEvent.findMany({
      where: { botId },
      orderBy: { receivedAt: "asc" },
      take: excess,
      select: { id: true },
    });
    if (oldest.length > 0) {
      await prisma.webhookEvent.deleteMany({
        where: { id: { in: oldest.map((e) => e.id) } },
      });
    }
  }
}
