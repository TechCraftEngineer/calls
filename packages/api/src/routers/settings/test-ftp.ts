import { testFtpConnection } from "@calls/jobs";
import { workspaceAdminProcedure } from "../../orpc";
import { ftpCredentialsSchema } from "./schemas";

export const testFtp = workspaceAdminProcedure
  .input(ftpCredentialsSchema)
  .handler(async ({ input }) => {
    const result = await testFtpConnection({
      host: input.host,
      user: input.user,
      password: input.password,
    });
    if (result.success) {
      return { success: true, message: "Подключение установлено" };
    }
    return { success: false, message: result.error };
  });
