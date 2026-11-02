import "./lib/load-env";
import app from "./app";
import { logger } from "./lib/logger";
import { startPublicationDeliveryWorker } from "./lib/publication-delivery";

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

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  if (!process.env.RESEND_API_KEY?.trim()) {
    logger.warn("Direct Resend email is unavailable until RESEND_API_KEY is configured; no connector fallback is used");
  }
  startPublicationDeliveryWorker();
});
