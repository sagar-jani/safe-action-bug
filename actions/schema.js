import { z } from "zod";
export const updateLenderSchema = z.object({
  id: z.string().uuid(),
  name: z.string({ required_error: "Name is required." }),
  trailRate: z.coerce.number().optional(),
  status: z.string({ required_error: "Please select status." }),
  aliases: z.array(
    z.object({
      name: z.string().optional(),
    })
  ),
});
