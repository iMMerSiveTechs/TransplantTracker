import { createAuthClient } from "better-auth/react";

const baseURL = process.env.EXPO_PUBLIC_BACKEND_URL!;

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    credentials: "include",
  },
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
