import PgBoss from "pg-boss";
import { QUEUE_NAMES, type JobPayloads, type QueueName } from "@recallpilot/core";

const globalCache = globalThis as unknown as { __recallpilotBoss?: Promise<PgBoss> };

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for the job queue.");
  return url;
}

export function createBoss(): PgBoss {
  return new PgBoss({
    connectionString: connectionString(),
    schema: "pgboss",
    max: Number.parseInt(process.env.DATABASE_POOL_MAX ?? "10", 10),
    retryLimit: 3,
    retryDelay: 5,
    retryBackoff: true,
    expireInMinutes: 30,
    retentionMinutes: 60 * 24 * 14,
  });
}

export async function ensureQueues(boss: PgBoss): Promise<void> {
  for (const name of Object.values(QUEUE_NAMES)) {
    const existing = await boss.getQueue(name);
    if (!existing) {
      await boss.createQueue(name, {
        name,
        retryLimit: 3,
        retryDelay: 5,
        retryBackoff: true,
        expireInMinutes: 30,
        retentionMinutes: 60 * 24 * 14,
      });
    }
  }
}

export function getBoss(): Promise<PgBoss> {
  if (!globalCache.__recallpilotBoss) {
    globalCache.__recallpilotBoss = (async () => {
      const boss = createBoss();
      boss.on("error", (error) => console.error("[pg-boss] error", error));
      await boss.start();
      await ensureQueues(boss);
      return boss;
    })();
  }
  return globalCache.__recallpilotBoss;
}

export async function enqueue<K extends QueueName>(queue: K, payload: JobPayloads[K]): Promise<string | null> {
  const boss = await getBoss();
  return boss.send(queue, payload, {
    retryLimit: 3,
    retryDelay: 5,
    retryBackoff: true,
    expireInMinutes: 30,
  });
}

export async function stopBoss(): Promise<void> {
  if (globalCache.__recallpilotBoss) {
    const boss = await globalCache.__recallpilotBoss;
    await boss.stop({ graceful: true, wait: true });
    globalCache.__recallpilotBoss = undefined;
  }
}
