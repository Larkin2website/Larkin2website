import "../lib/load-env";
import { pool } from "@workspace/db";
import { bootstrapStaff } from "../lib/staff-accounts";
import { logger } from "../lib/logger";

// Deliberate operator command, never imported by application startup.
try {
  await bootstrapStaff(process.env.FIRST_ADMIN_EMAIL ?? "", process.env.FIRST_ADMIN_NAME?.trim() || "Staff administrator");
  logger.info("First-administrator invitation queued. Approved worker configuration is required for delivery.");
} catch {
  logger.error("Administrator setup did not complete. Check the documented configuration and existing membership state.");
  process.exitCode = 1;
} finally { await pool.end(); }
