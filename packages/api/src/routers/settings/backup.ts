import { systemRepository } from "@calls/db";
import { workspaceAdminProcedure } from "../../orpc";

export const backup = workspaceAdminProcedure.handler(async ({ context }) => {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T.]/g, "")
    .slice(0, 15);
  const backupFilename = `pg_backup_${timestamp}.sql`;
  await systemRepository.addActivityLog(
    "info",
    `Запрошена резервная копия PostgreSQL: ${backupFilename} (выполните pg_dump вручную)`,
    (context.user as Record<string, unknown>).username as string,
    context.workspaceId,
  );
  return {
    success: true,
    message: "Резервная копия: выполните pg_dump $POSTGRES_URL > backup.sql",
    path: backupFilename,
  };
});
