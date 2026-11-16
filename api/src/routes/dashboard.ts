import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const router = Router();

const querySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mês deve estar no formato AAAA-MM")
    .optional(),
});

const round2 = (n: number) => Math.round(n * 100) / 100;

// Início do mês (inclusivo) e início do mês seguinte (exclusivo)
function monthRange(month: string) {
  const [year, m] = month.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, m - 1, 1)),
    end: new Date(Date.UTC(year, m, 1)),
  };
}

async function totalsByType(userId: string, start: Date, end: Date) {
  const rows = await prisma.transaction.groupBy({
    by: ["type"],
    where: { userId, date: { gte: start, lt: end } },
    _sum: { amount: true },
  });

  const income = Number(rows.find((r) => r.type === "INCOME")?._sum.amount ?? 0);
  const expense = Number(rows.find((r) => r.type === "EXPENSE")?._sum.amount ?? 0);

  return { income, expense, balance: round2(income - expense) };
}

router.get("/", async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.issues });
    return;
  }

  const userId = req.userId!;
  const month = parsed.data.month ?? new Date().toISOString().slice(0, 7);
  const { start, end } = monthRange(month);

  // Últimos 6 meses, terminando no mês selecionado
  const [year, m] = month.split("-").map(Number);
  const months = Array.from({ length: 6 }, (_, i) =>
    new Date(Date.UTC(year, m - 1 - (5 - i), 1)).toISOString().slice(0, 7)
  );

  const [summary, expenseByCategory, evolution, accountsSum, allTimeSums] =
    await Promise.all([
      totalsByType(userId, start, end),
      prisma.transaction.groupBy({
        by: ["categoryId"],
        where: { userId, type: "EXPENSE", date: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
      Promise.all(
        months.map(async (mo) => {
          const r = monthRange(mo);
          return { month: mo, ...(await totalsByType(userId, r.start, r.end)) };
        })
      ),
      prisma.account.aggregate({
        where: { userId },
        _sum: { initialBalance: true },
      }),
      prisma.transaction.groupBy({
        by: ["type"],
        where: { userId },
        _sum: { amount: true },
      }),
    ]);

  const categories = await prisma.category.findMany({
    where: { id: { in: expenseByCategory.map((c) => c.categoryId) } },
    select: { id: true, name: true, color: true },
  });

  const byCategory = expenseByCategory
    .map((row) => {
      const cat = categories.find((c) => c.id === row.categoryId);
      const total = Number(row._sum.amount ?? 0);
      return {
        categoryId: row.categoryId,
        name: cat?.name ?? "Sem categoria",
        color: cat?.color ?? null,
        total,
        percent: summary.expense > 0 ? round2((total / summary.expense) * 100) : 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  const allIncome = Number(allTimeSums.find((r) => r.type === "INCOME")?._sum.amount ?? 0);
  const allExpense = Number(allTimeSums.find((r) => r.type === "EXPENSE")?._sum.amount ?? 0);
  const totalBalance = round2(
    Number(accountsSum._sum.initialBalance ?? 0) + allIncome - allExpense
  );

  res.json({ month, summary, totalBalance, byCategory, evolution });
});

export default router;