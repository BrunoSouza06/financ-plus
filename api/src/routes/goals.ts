import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

const router = Router();

const toDate = (d: string) => new Date(`${d}T00:00:00.000Z`);

const isRealDate = (d: string) => {
  const date = toDate(d);
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === d;
};

const goalSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(60),
  targetAmount: z.number().positive("A meta deve ser maior que zero"),
  savedAmount: z
    .number()
    .min(0, "O valor guardado não pode ser negativo")
    .default(0),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato AAAA-MM-DD")
    .refine(isRealDate, "Data inválida")
    .nullable()
    .optional(),
});

const serialize = <
  T extends { targetAmount: Prisma.Decimal; savedAmount: Prisma.Decimal },
>(
  g: T,
) => ({
  ...g,
  targetAmount: Number(g.targetAmount),
  savedAmount: Number(g.savedAmount),
});

router.get("/", async (req, res) => {
  const goals = await prisma.goal.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: "asc" },
  });
  res.json(goals.map(serialize));
});

router.post("/", async (req, res) => {
  const parsed = goalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.issues });
    return;
  }

  const { deadline, ...rest } = parsed.data;
  const goal = await prisma.goal.create({
    data: {
      ...rest,
      deadline: deadline ? toDate(deadline) : null,
      userId: req.userId!,
    },
  });
  res.status(201).json(serialize(goal));
});

router.put("/:id", async (req, res) => {
  const id = String(req.params.id);
  const parsed = goalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.issues });
    return;
  }

  const existing = await prisma.goal.findFirst({
    where: { id, userId: req.userId! },
  });
  if (!existing) {
    res.status(404).json({ error: "Meta não encontrada" });
    return;
  }

  const { deadline, ...rest } = parsed.data;
  const goal = await prisma.goal.update({
    where: { id },
    data: { ...rest, deadline: deadline ? toDate(deadline) : null },
  });
  res.json(serialize(goal));
});

router.delete("/:id", async (req, res) => {
  const id = String(req.params.id);

  const existing = await prisma.goal.findFirst({
    where: { id, userId: req.userId! },
  });
  if (!existing) {
    res.status(404).json({ error: "Meta não encontrada" });
    return;
  }

  await prisma.goal.delete({ where: { id } });
  res.status(204).send();
});

export default router;
