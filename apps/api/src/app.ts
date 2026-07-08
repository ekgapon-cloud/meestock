import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { router } from "./routes/index.js";

export const app: Express = express();

app.use(helmet());
// CORS_ORIGIN unset = reflect any origin (dev convenience only — must be set in production, see docs/deployment.md).
app.use(cors({ origin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(",").map((o) => o.trim()) : true }));
app.use(express.json());
app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
app.use("/api/v1", router);
app.use(errorHandler);
