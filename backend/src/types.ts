import type { Context } from "hono";

export type AppEnv = {
  Variables: {
    user: { id: string; name: string; email: string };
    session: { id: string; token: string; userId: string };
  };
};

export type AppContext = Context<AppEnv>;
