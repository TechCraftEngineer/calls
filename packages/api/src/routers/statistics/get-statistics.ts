import { callsService, settingsService } from "@calls/db";
import { z } from "zod";
import { workspaceMemberProcedure } from "../../orpc";

export const getStatistics = workspaceMemberProcedure
  .input(
    z.object({
      date_from: z.string().optional(),
      date_to: z.string().optional(),
      sort: z.string().optional(),
      order: z.string().optional(),
    }),
  )
  .handler(async ({ input, context }) => {
    const { workspaceId } = context;
    let dateFrom = input.date_from;
    let dateTo = input.date_to;
    if (!dateFrom && !dateTo) {
      const now = new Date();
      dateTo = now.toISOString().slice(0, 10);
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      dateFrom = d.toISOString().slice(0, 10);
    } else {
      if (dateFrom && !dateTo) dateTo = dateFrom;
      if (dateTo && !dateFrom) dateFrom = dateTo;
    }
    const dateFromDb = dateFrom ? `${dateFrom} 00:00:00` : undefined;
    const dateToDb = dateTo ? `${dateTo} 23:59:59` : undefined;
    const ftpSettings = await settingsService.getFtpSettings(workspaceId);
    const excludePhoneNumbers = ftpSettings.excludePhoneNumbers ?? [];
    const stats = await callsService.getEvaluationsStats({
      workspaceId,
      dateFrom: dateFromDb,
      dateTo: dateToDb,
      excludePhoneNumbers: excludePhoneNumbers.length > 0 ? excludePhoneNumbers : undefined,
    });
    const statsList = Object.values(stats);
    const reverse = input.order === "desc";
    const sortKey = input.sort ?? "name";
    statsList.sort((a: unknown, b: unknown) => {
      const sa = a as {
        name: string;
        incoming: { count: number };
        outgoing: { count: number };
      };
      const sb = b as {
        name: string;
        incoming: { count: number };
        outgoing: { count: number };
      };
      let va: string | number = sa.name;
      let vb: string | number = sb.name;
      if (sortKey === "incoming_count") {
        va = sa.incoming.count;
        vb = sb.incoming.count;
      } else if (sortKey === "outgoing_count") {
        va = sa.outgoing.count;
        vb = sb.outgoing.count;
      }
      if (typeof va === "string")
        return reverse
          ? (vb as string).localeCompare(va)
          : (va as string).localeCompare(vb as string);
      return reverse ? (vb as number) - va : va - (vb as number);
    });
    return {
      statistics: statsList,
      date_from: dateFrom ?? "",
      date_to: dateTo ?? "",
    };
  });
