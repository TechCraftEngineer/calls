import { z } from "zod";
import { publicProcedure } from "../../orpc";
import { extractUserFields } from "../../user-profile";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const login = publicProcedure
  .input(loginSchema)
  .handler(async ({ input, context }) => {
    const user = await context.usersService.getUserByUsername(
      input.username.trim(),
    );
    if (!user) {
      throw new Error("Invalid credentials");
    }
    const fields = extractUserFields(user);
    return {
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        username: fields.username,
        name: user.name,
        givenName: fields.givenName,
        familyName: fields.familyName,
      },
    };
  });
