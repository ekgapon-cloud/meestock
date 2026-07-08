import "dotenv/config";

// Cosmetic-only: @prisma/adapter-pg's own relation-batching internals trigger this
// pg deprecation warning inside every $transaction with nested includes. Root-caused
// (stack trace) to Prisma's code, not ours — see memory.md. Suppress just this one
// known-benign message so real deprecation warnings still surface.
process.removeAllListeners("warning");
process.on("warning", (warning) => {
  if (
    warning.name === "DeprecationWarning" &&
    warning.message.includes("client.query() when the client is already executing a query")
  ) {
    return;
  }
  console.warn(warning);
});

// Redirect the app's Prisma client at the dedicated test database before any
// application module (config/env.ts, lib/prisma.ts) is imported and reads
// process.env. dotenv doesn't overwrite already-set vars, so this must run first.
if (process.env["TEST_DATABASE_URL"]) {
  process.env["DATABASE_URL"] = process.env["TEST_DATABASE_URL"];
} else {
  throw new Error("TEST_DATABASE_URL is not set — required to run tests against a dedicated test database");
}
