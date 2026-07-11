import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { router } from "./routes/index.js";

export const app: Express = express();

// Behind Railway's (and most PaaS) reverse proxy the real client IP arrives in
// X-Forwarded-For; without this Express reports the proxy's IP for every request,
// which collapses the login rate-limiter into a single shared bucket (one office-wide
// lockout) and records the wrong IP in the StockTransaction audit trail. `1` = trust
// the single hop in front of us, not the whole chain (avoids XFF spoofing).
app.set("trust proxy", 1);

app.use(helmet());
// CORS_ORIGIN unset = reflect any origin (dev convenience only — must be set in production, see docs/deployment.md).
app.use(cors({ origin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(",").map((o) => o.trim()) : true }));
app.use(express.json());
app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
app.use("/api/v1", router);
app.use(errorHandler);
