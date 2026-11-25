import "dotenv/config";
import express from "express";
import cors from "cors";
import { requireAuth } from "./middlewares/auth";
import accountsRouter from "./routes/accounts";
import categoriesRouter from "./routes/categories";
import transactionsRouter from "./routes/transactions";
import dashboardRouter from "./routes/dashboard";
import goalsRouter from "./routes/goals";
import recurringRouter from "./routes/recurring";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", app: "FinanC+ API" });
});

const port = process.env.PORT || 3333;

app.get("/me", requireAuth, (req, res) => {
  res.json({ userId: req.userId });
});

app.use("/accounts", requireAuth, accountsRouter);
app.use("/categories", requireAuth, categoriesRouter);
app.use("/transactions", requireAuth, transactionsRouter);
app.use("/dashboard", requireAuth, dashboardRouter);
app.use("/goals", requireAuth, goalsRouter);
app.use("/recurring", requireAuth, recurringRouter);

app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});
