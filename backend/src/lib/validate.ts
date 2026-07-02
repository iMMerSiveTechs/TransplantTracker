import type { Context } from "hono";
import type { z } from "zod";

export async function parseBody<T extends z.ZodType>(
  c: Context,
  schema: T
): Promise<z.infer<T> | Response> {
  const raw = await c.req.json().catch(() => null);
  const result = schema.safeParse(raw);
  if (!result.success) {
    return c.json(
      { error: { message: "Validation failed", code: "VALIDATION_ERROR", details: result.error.issues } },
      400
    );
  }
  return result.data;
}
