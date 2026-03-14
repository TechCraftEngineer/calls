import { promptsService, settingsService } from "@calls/db";
import { workspaceProcedure } from "../../orpc";

const MEGAFON_FTP_KEYS = [
  "megafon_ftp_enabled",
  "megafon_ftp_host",
  "megafon_ftp_user",
  "megafon_ftp_password",
] as const;

export const getPrompts = workspaceProcedure.handler(async ({ context }) => {
  const [allPrompts, megafonFtp] = await Promise.all([
    promptsService.getAllPrompts(context.workspaceId),
    settingsService.getMegafonFtpSettings(context.workspaceId),
  ]);

  const promptsFiltered = allPrompts.filter(
    (p) =>
      !MEGAFON_FTP_KEYS.includes(p.key as (typeof MEGAFON_FTP_KEYS)[number]),
  );

  const megafonEntries = [
    {
      key: "megafon_ftp_enabled",
      value: megafonFtp.enabled ? "true" : "false",
      description: "Megafon FTP включён",
      updatedAt: null as Date | null,
    },
    {
      key: "megafon_ftp_host",
      value: megafonFtp.host ?? "",
      description: "Megafon FTP host",
      updatedAt: null as Date | null,
    },
    {
      key: "megafon_ftp_user",
      value: megafonFtp.user ?? "",
      description: "Megafon FTP user",
      updatedAt: null as Date | null,
    },
    {
      key: "megafon_ftp_password",
      value: megafonFtp.password ?? "",
      description: "Megafon FTP password",
      updatedAt: null as Date | null,
    },
  ];

  return [...promptsFiltered, ...megafonEntries];
});
