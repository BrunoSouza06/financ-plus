import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const router = Router();

const accountSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(60),
  type: z.enum(["CHECKING", "SAVINGS", "CASH", "CREDIT_CARD", "INVESTMENT"]),
  initialBalance: z.number().default(0),
});

// Listar contas, já com o saldo atual
router.get("/", async (req, res) => {
  const userId = req.userId!;

  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  const sums = await prisma.transaction.groupBy({
    by: ["accountId", "type"],
    where: { userId },
    _sum: { amount: true },
  });

  const result = accounts.map((acc) => {
    const income = sums.find((s) => s.accountId === acc.id && s.type === "INCOME")?._sum.amount ?? 0;
    const expense = sums.find((s) => s.accountId === acc.id && s.type === "EXPENSE")?._sum.amount ?? 0;
    const initialBalance = Number(acc.initialBalance);

    return {
      ...acc,
      initialBalance,
      balance: initialBalance + Number(income) - Number(expense),
    };
  });

  res.json(result);
});

// Criar conta
router.post("/", async (req, res) => {
  const parsed = accountSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.issues });
    return;
  }

  const account = await prisma.account.create({
    data: { ...parsed.data, userId: req.userId! },
  });

  res.status(201).json(account);
});

// Editar conta
router.put("/:id", async (req, res) => {
  const id = String(req.params.id);
  const parsed = accountSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.issues });
    return;
  }

  const existing = await prisma.account.findFirst({
    where: { id, userId: req.userId! },
  });
  if (!existing) {
    res.status(404).json({ error: "Conta não encontrada" });
    return;
  }

  const account = await prisma.account.update({
    where: { id },
    data: parsed.data,
  });

  res.json(account);
});

// Excluir conta (bloqueia se tiver transações)
router.delete("/:id", async (req, res) => {
  const id = String(req.params.id);

  const existing = await prisma.account.findFirst({
    where: { id, userId: req.userId! },
  });
  if (!existing) {
    res.status(404).json({ error: "Conta não encontrada" });
    return;
  }

  const total = await prisma.transaction.count({ where: { accountId: id } });
  if (total > 0) {
    res.status(409).json({ error: "Conta possui transações e não pode ser excluída" });
    return;
  }

  await prisma.account.delete({ where: { id } });
  res.status(204).send();
});

export default router;