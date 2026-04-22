import { z } from "zod";
import { publicProcedure } from "../../orpc";
import { extractUserFields } from "../../user-profile";

const loginSchema = z.object({
  email: z.email("Введите корректный email"),
  password: z.string().min(1, "Пароль обязателен"),
});

export const login = publicProcedure.input(loginSchema).handler(async ({ input, context }) => {
  const user = await context.usersService.getUserByEmail(input.email.trim().toLowerCase());
  if (!user) {
    throw new Error("Invalid credentials");
  }
  const fields = extractUserFields(user);
  return {
    success: true,
    message: "Login successful",
    user: {
      id: user.id,
      email: fields.email,
      name: user.name,
      givenName: fields.givenName,
      familyName: fields.familyName,
    },
  };
});
