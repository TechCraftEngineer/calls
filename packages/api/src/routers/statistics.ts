import { storage } from "@calls/db";
import { z } from "zod";
import { adminProcedure, protectedProcedure } from "../orpc";

export const statisticsRouter = {
  getStatistics: adminProcedure
    .input(
      z.object({
        date_from: z.string().optional(),
        date_to: z.string().optional(),
        sort: z.string().optional(),
        order: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
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
      const stats = await storage.getEvaluationsStats({
        dateFrom: dateFromDb,
        dateTo: dateToDb,
      });
      const statsList = Object.values(stats);
      const reverse = input.order === "desc";
      const sortKey = input.sort ?? "name";
      statsList.sort((a, b) => {
        let va: string | number = a.name;
        let vb: string | number = b.name;
        if (sortKey === "incoming_count") {
          va = a.incoming.count;
          vb = b.incoming.count;
        } else if (sortKey === "outgoing_count") {
          va = a.outgoing.count;
          vb = b.outgoing.count;
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
    }),

  getMetrics: protectedProcedure.handler(async () => {
    return await storage.calculateMetrics();
  }),
};
