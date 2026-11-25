import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { isRealDate, toDate } from "../lib/dates";

const router = Router();

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato AAAA-MM-DD")
  .refine(isRealDate, "Data inválida");

const transactionSchema = z.object({
  description: z.string().trim().min(1, "Descrição obrigatória").max(100),
  amount: z.number().positive("Valor deve ser maior que zero"),
  type: z.enum(["INCOME", "EXPENSE"]),
  date: dateString,
  accountId: z.uuid(),
  categoryId: z.uuid(),
});

const listQuerySchema = z.object({
  from: dateString.optional(),
  to: dateString.optional(),
  accountId: z.uuid().optional(),
  categoryId: z.uuid().optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const serialize = <T extends { amount: Prisma.Decimal }>(t: T) => ({
  ...t,
  amount: Number(t.amount),
});

// Confere se conta e categoria são do usuário e se o tipo bate
async function validateRefs(
  userId: string,
  data: z.infer<typeof transactionSchema>,
) {
  const [account, category] = await Promise.all([
    prisma.account.findFirst({ where: { id: data.accountId, userId } }),
    prisma.category.findFirst({ where: { id: data.categoryId, userId } }),
  ]);

  if (!account) return "Conta não encontrada";
  if (!category) return "Categoria não encontrada";
  if (category.type !== data.type) {
    return "O tipo da categoria não corresponde ao tipo da transação";
  }
  return null;
}

// Listar com filtros e paginação
router.get("/", async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.issues });
    return;
  }

  const { from, to, accountId, categoryId, type, page, limit } = parsed.data;

  const where: Prisma.TransactionWhereInput = { userId: req.userId! };
  if (accountId) where.accountId = accountId;
  if (categoryId) where.categoryId = categoryId;
  if (type) where.type = type;
  if (from || to) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (from) dateFilter.gte = toDate(from);
    if (to) dateFilter.lte = toDate(to);
    where.date = dateFilter;
  }

  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        account: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  res.json({ items: items.map(serialize), total, page, limit });
});

// Criar
router.post("/", async (req, res) => {
  const parsed = transactionSchema.safeParse(req.body);
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

  const { date, ...rest } = parsed.data;
  const transaction = await prisma.transaction.create({
    data: { ...rest, date: toDate(date), userId },
  });

  res.status(201).json(serialize(transaction));
});

// Editar
router.put("/:id", async (req, res) => {
  const id = String(req.params.id);
  const parsed = transactionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.issues });
    return;
  }

  const userId = req.userId!;
  const existing = await prisma.transaction.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    res.status(404).json({ error: "Transação não encontrada" });
    return;
  }

  const refError = await validateRefs(userId, parsed.data);
  if (refError) {
    res.status(400).json({ error: refError });
    return;
  }

  const { date, ...rest } = parsed.data;
  const transaction = await prisma.transaction.update({
    where: { id },
    data: { ...rest, date: toDate(date) },
  });

  res.json(serialize(transaction));
});

// Excluir
router.delete("/:id", async (req, res) => {
  const id = String(req.params.id);

  const existing = await prisma.transaction.findFirst({
    where: { id, userId: req.userId! },
  });
  if (!existing) {
    res.status(404).json({ error: "Transação não encontrada" });
    return;
  }

  await prisma.transaction.delete({ where: { id } });
  res.status(204).send();
});

export default router;
