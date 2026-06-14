import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { authRouter, requireAuth } from "./routes/auth.js";
import { groupsRouter } from "./routes/groups.js";
import { importsRouter } from "./routes/imports.js";
import { balancesRouter } from "./routes/balances.js";
import { expensesRouter } from "./routes/expenses.js";
import { paymentsRouter } from "./routes/payments.js";

const app = express();

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (origin === config.clientOrigin || /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+):5173$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} is not allowed by SplitPilot CORS.`));
  },
  credentials: true
}));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "SplitPilot" });
});

app.use("/api/auth", authRouter);
app.use("/api/groups", requireAuth, groupsRouter);
app.use("/api/imports", requireAuth, importsRouter);
app.use("/api/balances", requireAuth, balancesRouter);
app.use("/api/expenses", requireAuth, expensesRouter);
app.use("/api/payments", requireAuth, paymentsRouter);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: error.message || "Unexpected server error." });
});

app.listen(config.port, () => {
  console.log(`SplitPilot API listening on http://localhost:${config.port}`);
});
