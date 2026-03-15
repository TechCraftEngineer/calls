import { publicProcedure } from "../../orpc";

export const logout = publicProcedure.handler(() => {
  return { success: true, message: "Logged out" };
});
