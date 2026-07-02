import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { medication } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import type { AppEnv } from "../types";

const medsRouter = new Hono<AppEnv>();
medsRouter.use("*", authMiddleware);

const medBody = z.object({
  name: z.string(),
  dosage: z.string(),
  instr: z.string().optional().default(""),
  inv: z.number().optional().default(0),
  ppd: z.number().optional().default(1),
  critical: z.boolean().optional().default(false),
  color: z.string().optional().default("#6366f1"),
  isTac: z.boolean().optional().default(false),
});

medsRouter.get("/", async (c) => {
  const user = c.get("user");
  const results = await db
    .select()
    .from(medication)
    .where(eq(medication.userId, user.id));
  return c.json({ data: results });
});

medsRouter.post("/", async (c) => {
  const user = c.get("user");
  const raw = await c.req.json();
  const parsed = medBody.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: { message: "Validation failed", code: "VALIDATION_ERROR" } }, 400);
  }
  const body = parsed.data;
  const now = new Date();

  const id = crypto.randomUUID();
  await db.insert(medication).values({
    id,
    userId: user.id,
    name: body.name,
    dosage: body.dosage,
    instr: body.instr,
    inv: body.inv,
    ppd: body.ppd,
    critical: body.critical,
    color: body.color,
    isTac: body.isTac,
    createdAt: now,
    updatedAt: now,
  });

  const result = await db
    .select()
    .from(medication)
    .where(eq(medication.id, id))
    .limit(1);
  return c.json({ data: result[0] }, 201);
});

medsRouter.put("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const raw = await c.req.json();
  const parsed = medBody.partial().safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: { message: "Validation failed", code: "VALIDATION_ERROR" } }, 400);
  }
  const body = parsed.data;
  const now = new Date();

  const updateData: Record<string, unknown> = { updatedAt: now };
  if (body.name !== undefined) updateData.name = body.name;
  if (body.dosage !== undefined) updateData.dosage = body.dosage;
  if (body.instr !== undefined) updateData.instr = body.instr;
  if (body.inv !== undefined) updateData.inv = body.inv;
  if (body.ppd !== undefined) updateData.ppd = body.ppd;
  if (body.critical !== undefined) updateData.critical = body.critical;
  if (body.color !== undefined) updateData.color = body.color;
  if (body.isTac !== undefined) updateData.isTac = body.isTac;

  await db
    .update(medication)
    .set(updateData)
    .where(and(eq(medication.id, id), eq(medication.userId, user.id)));

  const result = await db
    .select()
    .from(medication)
    .where(and(eq(medication.id, id), eq(medication.userId, user.id)))
    .limit(1);

  if (!result.length) {
    return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);
  }
  return c.json({ data: result[0] });
});

medsRouter.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  await db
    .delete(medication)
    .where(and(eq(medication.id, id), eq(medication.userId, user.id)));

  return c.body(null, 204);
});

medsRouter.post("/bulk", async (c) => {
  const user = c.get("user");
  const raw = await c.req.json();
  const parsed = z.array(medBody).safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: { message: "Validation failed", code: "VALIDATION_ERROR" } }, 400);
  }
  const meds = parsed.data;
  const now = new Date();

  for (const med of meds) {
    await db.insert(medication).values({
      id: crypto.randomUUID(),
      userId: user.id,
      name: med.name,
      dosage: med.dosage,
      instr: med.instr,
      inv: med.inv,
      ppd: med.ppd,
      critical: med.critical,
      color: med.color,
      isTac: med.isTac,
      createdAt: now,
      updatedAt: now,
    });
  }

  const results = await db
    .select()
    .from(medication)
    .where(eq(medication.userId, user.id));
  return c.json({ data: results }, 201);
});

export { medsRouter };
