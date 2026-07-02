import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { profile } from "../db/schema";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import type { AppEnv } from "../types";

const profileRouter = new Hono<AppEnv>();
profileRouter.use("*", authMiddleware);

const profileBody = z.object({
  name: z.string(),
  type: z.string(),
  surgDate: z.string(),
  emergPhone: z.string().optional().default(""),
  contacts: z
    .array(
      z.object({
        icon: z.string(),
        label: z.string(),
        sub: z.string(),
        phone: z.string(),
        urgent: z.boolean().optional(),
      })
    )
    .optional()
    .default([]),
});

profileRouter.get("/", async (c) => {
  const user = c.get("user");
  const result = await db
    .select()
    .from(profile)
    .where(eq(profile.userId, user.id))
    .limit(1);

  if (!result.length) {
    return c.json({ data: null });
  }
  const p = result[0]!;
  return c.json({
    data: { ...p, contacts: JSON.parse(p.contacts) },
  });
});

profileRouter.put("/", async (c) => {
  const user = c.get("user");
  const raw = await c.req.json();
  const parsed = profileBody.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: { message: "Validation failed", code: "VALIDATION_ERROR" } }, 400);
  }
  const body = parsed.data;
  const now = new Date();

  const existing = await db
    .select()
    .from(profile)
    .where(eq(profile.userId, user.id))
    .limit(1);

  if (existing.length) {
    await db
      .update(profile)
      .set({
        name: body.name,
        type: body.type,
        surgDate: body.surgDate,
        emergPhone: body.emergPhone,
        contacts: JSON.stringify(body.contacts),
        updatedAt: now,
      })
      .where(eq(profile.userId, user.id));
  } else {
    await db.insert(profile).values({
      id: crypto.randomUUID(),
      userId: user.id,
      name: body.name,
      type: body.type,
      surgDate: body.surgDate,
      emergPhone: body.emergPhone,
      contacts: JSON.stringify(body.contacts),
      createdAt: now,
      updatedAt: now,
    });
  }

  const result = await db
    .select()
    .from(profile)
    .where(eq(profile.userId, user.id))
    .limit(1);
  const p = result[0]!;
  return c.json({
    data: { ...p, contacts: JSON.parse(p.contacts) },
  });
});

export { profileRouter };
