import { createClient } from "@/supabase/client/server";
import {
  DEFAULT_SERVER_ERROR_MESSAGE,
  createSafeActionClient,
} from "next-safe-action";
import { z } from "zod";

export class ActionError extends Error {}

export const action = createSafeActionClient({
  handleReturnedServerError: (e) => {
    console.error("Action server error occurred:", e.message);
    if (e instanceof ActionError) {
      return e.message;
    }
    return DEFAULT_SERVER_ERROR_MESSAGE;
  },
});

export const actionWithMeta = createSafeActionClient({
  handleReturnedServerError(e) {
    if (e instanceof ActionError) {
      return e.message;
    }
    return DEFAULT_SERVER_ERROR_MESSAGE;
  },
  defineMetadataSchema: () => {
    return z.object({
      permission: z.string(),
    });
  },
});

export const authAction = actionWithMeta.use(async ({ next, metadata }) => {
  const supabase = createClient();

  return next({
    ctx: {
      supabase,
    },
  });
});
