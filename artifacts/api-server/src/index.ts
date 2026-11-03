import "./lib/load-env";
import app from "./app";
import { logger } from "./lib/logger";
import { startPublicationDeliveryWorker } from "./lib/publication-delivery";
import { startEmailQuotaWorker } from "./lib/email-quota";
import { pool } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const stops: Array<() => Promise<void>> = [];
const server = app.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "Server listening");
  if (!process.env.RESEND_API_KEY?.trim()) {
    logger.warn("Direct Resend email is unavailable until RESEND_API_KEY is configured; no connector fallback is used");
  }
  stops.push(startPublicationDeliveryWorker(), startEmailQuotaWorker());
});
server.on("error", () => { logger.error("Server failed to listen"); process.exit(1); });
let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("Stopping HTTP and email workers");
  const deadline = setTimeout(() => process.exit(1), 25_000);
  deadline.unref();
  try {
    await Promise.all([
      new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve())),
      ...stops.map(stop => stop()),
    ]);
    await pool.end();
    clearTimeout(deadline);
    process.exit(0);
  } catch { logger.error("Shutdown could not finish; persistent leases will recover"); process.exit(1); }
}
process.on("SIGTERM", () => { void shutdown(); });
process.on("SIGINT", () => { void shutdown(); });
