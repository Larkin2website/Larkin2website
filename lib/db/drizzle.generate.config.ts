import { defineConfig } from "drizzle-kit";
import path from "node:path";

// Offline generation only. No connection string, DDL execution, or seeding.
export default defineConfig({
  schema: path.resolve(__dirname, "src/schema/index.ts"),
  out: path.resolve(__dirname, "migrations"),
  dialect: "postgresql",
});
