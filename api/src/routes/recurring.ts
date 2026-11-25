import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { pendingOccurrences, toDate } from "../lib/dates";

const router = Router();

const recurringSchema = z.object({
  description: z.string().trim().min(1, "Descrição obrigatória").max(100),
  amount: z.number().positive("Valor deve ser maior que zero"),
  type: z.enum(["INCOME", "EXPENSE"]),
  dayOfMonth: z
    .number()
    .int()
    .min(1, "O dia deve ser entre 1 e 31")
    .max(31, "O dia deve ser entre 1 e 31"),
  accountId: z.uuid(),
  categoryId: z.uuid(),
  startMonth: z
    .string()
    .regex(
      /^\d{4}-(0[1-9]|1[0-2])$/,
      "Mês inicial deve estar no formato AAAA-MM",
    ),
  active: z.boolean().default(true),
});

const serialize = <T extends { amount: Prisma.Decimal }>(r: T) => ({
  ...r,
  amount: Number(r.amount),
});

async function validateRefs(
  userId: string,
  data: z.infer<typeof recurringSchema>,
) {
  const [account, category] = await Promise.all([
    prisma.account.findFirst({ where: { id: data.accountId, userId } }),
    prisma.category.findFirst({ where: { id: data.categoryId, userId } }),
  ]);

  if (!account) return "Conta não encontrada";
  if (!category) return "Categoria não encontrada";
  if (category.type !== data.type) {
    return "O tipo da categoria não corresponde ao tipo do lançamento";
  }
  return null;
}

// Gera os lançamentos que faltam, até hoje
router.post("/run", async (req, res) => {
  const userId = req.userId!;
  const todayStr = new Date().toLocaleDateString("sv-SE");

  const items = await prisma.recurringTransaction.findMany({
    where: { userId, active: true },
  });

  let created = 0;

  for (const item of items) {
    const toCreate = pendingOccurrences(
      item.startMonth,
      item.lastGenerated,
      item.dayOfMonth,
      todayStr,
    );

    if (toCreate.length === 0) continue;

    await prisma.$transaction([
      prisma.transaction.createMany({
        data: toCreate.map(({ date }) => ({
          userId,
          description: item.description,
          amount: item.amount,
          type: item.type,
          date: toDate(date),
          accountId: item.accountId,
          categoryId: item.categoryId,
        })),
      }),
      prisma.recurringTransaction.update({
        where: { id: item.id },
        data: { lastGenerated: toCreate[toCreate.length - 1].month },
      }),
    ]);

    created += toCreate.length;
  }

  res.json({ created });
});

router.get("/", async (req, res) => {
  const items = await prisma.recurringTransaction.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: "asc" },
    include: {
      account: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
    },
  });
  res.json(items.map(serialize));
});

router.post("/", async (req, res) => {
  const parsed = recurringSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.issues });
    return;
  }

  const userId = req.userId!;
  const refError = await validateRefs(userId, parsed.data);
  if (refError) {
    res.status(400).json({ error: refError });
    return;
  }

  const item = await prisma.recurringTransaction.create({
    data: { ...parsed.data, userId },
  });
  res.status(201).json(serialize(item));
});

router.put("/:id", async (req, res) => {
  const id = String(req.params.id);
  const parsed = recurringSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.issues });
    return;
  }

  const userId = req.userId!;
  const existing = await prisma.recurringTransaction.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    res.status(404).json({ error: "Recorrência não encontrada" });
    return;
  }

  const refError = await validateRefs(userId, parsed.data);
  if (refError) {
    res.status(400).json({ error: refError });
    return;
  }

  const item = await prisma.recurringTransaction.update({
    where: { id },
    data: parsed.data,
  });
  res.json(serialize(item));
});

router.delete("/:id", async (req, res) => {
  const id = String(req.params.id);

  const existing = await prisma.recurringTransaction.findFirst({
    where: { id, userId: req.userId! },
  });
  if (!existing) {
    res.status(404).json({ error: "Recorrência não encontrada" });
    return;
  }

  await prisma.recurringTransaction.delete({ where: { id } });
  res.status(204).send();
});

export default router;
