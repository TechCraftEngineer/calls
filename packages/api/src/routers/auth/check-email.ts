import { z } from "zod";
import { publicProcedure } from "../../orpc";

const checkEmailSchema = z.object({
  email: z.string().email(),
});

export const checkEmail = publicProcedure
  .input(checkEmailSchema)
  .handler(async ({ input, context }) => {
    const user = await context.usersService.getUserByUsername(
      input.email.trim(),
    );
    return {
      exists: !!user,
    };
  });
