"use server";

import { createClient } from "@/supabase/client/server";
import { revalidatePath as revalidatePathFunc } from "next/cache";
import { authAction } from "./safe-action";
import { updateLenderSchema as lenderSchema } from "./schema";
import { name } from "assert";
export const updateLenderAction = authAction(
  lenderSchema,
  async ({ id, name, status, trailRate, aliases }) => {
    const supabase = createClient();
    console.log(
      "id",
      id,
      "name",
      name,
      "status",
      status,
      "trailRate",
      trailRate,
      "aliases",
      aliases
    );
    revalidatePathFunc("/lenders");
    return true;
  }
);
