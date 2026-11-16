import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

const router = Router();

const categorySchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(40),
  type: z.enum(["INCOME", "EXPENSE"]),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor deve estar no formato #RRGGBB")
    .optional(),
});

function isDuplicate(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

// Listar (opcional: ?type=INCOME ou ?type=EXPENSE)
router.get("/", async (req, res) => {
  const type = req.query.type;
  const where: Prisma.CategoryWhereInput = { userId: req.userId! };

  if (type === "INCOME" || type === "EXPENSE") {
    where.type = type;
  }

  const categories = await prisma.category.findMany({
    where,
    orderBy: { name: "asc" },
  });

  res.json(categories);
});

// Criar
router.post("/", async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.issues });
    return;
  }

  try {
    const category = await prisma.category.create({
      data: { ...parsed.data, userId: req.userId! },
    });
    res.status(201).json(category);
  } catch (error) {
    if (isDuplicate(error)) {
      res.status(409).json({ error: "Já existe uma categoria com esse nome e tipo" });
      return;
    }
    throw error;
  }
});

// Editar
router.put("/:id", async (req, res) => {
  const id = String(req.params.id);
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.issues });
    return;
  }

  const existing = await prisma.category.findFirst({
    where: { id, userId: req.userId! },
  });
  if (!existing) {
    res.status(404).json({ error: "Categoria não encontrada" });
    return;
  }

  try {
    const category = await prisma.category.update({
      where: { id },
      data: parsed.data,
    });
    res.json(category);
  } catch (error) {
    if (isDuplicate(error)) {
      res.status(409).json({ error: "Já existe uma categoria com esse nome e tipo" });
      return;
    }
    throw error;
  }
});

// Excluir (bloqueia se tiver transações)
router.delete("/:id", async (req, res) => {
  const id = String(req.params.id);

  const existing = await prisma.category.findFirst({
    where: { id, userId: req.userId! },
  });
  if (!existing) {
    res.status(404).json({ error: "Categoria não encontrada" });
    return;
  }

  const total = await prisma.transaction.count({ where: { categoryId: id } });
  if (total > 0) {
    res.status(409).json({ error: "Categoria possui transações e não pode ser excluída" });
    return;
  }

  await prisma.category.delete({ where: { id } });
  res.status(204).send();
});

export default router;