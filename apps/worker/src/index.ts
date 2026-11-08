import "./env";
import http from "node:http";
import {
  QUEUE_NAMES,
  type CommitImportJob,
  type LeadAuditJob,
  type PurgeRawJob,
  type ValidateImportJob,
} from "@recallpilot/core";
import { createBoss, ensureQueues } from "@recallpilot/integrations/jobs";
import { commitOrgImport, processLeadAudit, validateOrgImport } from "./pipeline";
import { purgeExpiredUploads } from "./purge";

async function main(): Promise<void> {
  const boss = createBoss();
  boss.on("error", (error) => console.error("[worker] pg-boss error", error));
  await boss.start();
  await ensureQueues(boss);

  await boss.work<LeadAuditJob>(
    QUEUE_NAMES.leadAudit,
    { batchSize: 1, pollingIntervalSeconds: 1 },
    async (jobs) => {
      for (const job of jobs) {
        console.log(`[worker] lead audit ${job.data.auditId}`);
        await processLeadAudit(job.data);
      }
    }
  );

  await boss.work<ValidateImportJob>(
    QUEUE_NAMES.validateImport,
    { batchSize: 1, pollingIntervalSeconds: 1 },
    async (jobs) => {
      for (const job of jobs) {
        console.log(`[worker] validate import ${job.data.importId}`);
        await validateOrgImport(job.data.importId);
      }
    }
  );

  await boss.work<CommitImportJob>(
    QUEUE_NAMES.commitImport,
    { batchSize: 1, pollingIntervalSeconds: 1 },
    async (jobs) => {
      for (const job of jobs) {
        console.log(`[worker] commit import ${job.data.importId}`);
        await commitOrgImport(job.data.importId);
      }
    }
  );

  await boss.work<PurgeRawJob>(
    QUEUE_NAMES.purgeRaw,
    { batchSize: 1, pollingIntervalSeconds: 2 },
    async () => {
      const result = await purgeExpiredUploads();
      console.log(`[worker] purge raw: ${result.purged} uploads, ${result.rowsDeleted} lead rows`);
    }
  );

  await boss.schedule(QUEUE_NAMES.purgeRaw, process.env.PURGE_CRON ?? "*/15 * * * *", {
    reason: "scheduled",
  });

  const healthPort = Number.parseInt(process.env.WORKER_HEALTH_PORT ?? process.env.PORT ?? "3101", 10);
  const healthServer = http.createServer((request, response) => {
    if (request.url === "/health") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ status: "ok", queues: Object.values(QUEUE_NAMES) }));
      return;
    }
    response.writeHead(404);
    response.end();
  });
  healthServer.listen(healthPort, "127.0.0.1", () => {
    console.log(`[worker] health server on http://127.0.0.1:${healthPort}/health`);
  });

  console.log(`[worker] ready · queues: ${Object.values(QUEUE_NAMES).join(", ")}`);

  const shutdown = async (signal: string) => {
    console.log(`[worker] ${signal} received, stopping`);
    healthServer.close();
    await boss.stop({ graceful: true, wait: true });
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
  console.error("[worker] fatal", error);
  process.exit(1);
});
