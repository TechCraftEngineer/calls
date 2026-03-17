/**
 * Workspace integrations repository - universal PBX integrations
 */

import { and, eq } from "drizzle-orm";
import { db } from "../client";
import type { FtpIntegrationConfig, IntegrationType } from "../schema";
import * as schema from "../schema";

const MIN_BASE64_LENGTH = 20;
const MIN_DECODED_BYTES = 28; // iv(12) + authTag(16) минимум

/** Проверка формата зашифрованного токена (enc: + base64) */
function isEncryptedTokenValid(encryptedToken: string): boolean {
  if (!encryptedToken || typeof encryptedToken !== "string") return false;
  if (!encryptedToken.startsWith("enc:")) return false;
  try {
    const base64Part = encryptedToken.slice(4);
    if (!base64Part || base64Part.length < MIN_BASE64_LENGTH) return false;
    const decoded = Buffer.from(base64Part, "base64");
    return decoded.length >= MIN_DECODED_BYTES;
  } catch {
    return false;
  }
}

export type ActiveFtpIntegration = {
  workspaceId: string;
  host: string;
  user: string;
  password: string;
  syncFromDate: string;
};

export const workspaceIntegrationsRepository = {
  /** Список активных интеграций FTP (enabled + валидный config) */
  async listActiveFtp(): Promise<ActiveFtpIntegration[]> {
    const rows = await db
      .select({
        workspaceId: schema.workspaceIntegrations.workspaceId,
        config: schema.workspaceIntegrations.config,
      })
      .from(schema.workspaceIntegrations)
      .where(
        and(
          eq(schema.workspaceIntegrations.integrationType, "ftp"),
          eq(schema.workspaceIntegrations.enabled, true),
        ),
      );

    const result: ActiveFtpIntegration[] = [];
    const defaultFromDate = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d.toISOString().slice(0, 10);
    })();
    for (const row of rows) {
      const cfg = row.config as {
        host?: string;
        user?: string;
        password?: string;
        syncDaysBack?: number;
        syncFromDate?: string;
      };
      if (cfg?.host && cfg?.user && cfg?.password) {
        let syncFromDate = defaultFromDate;
        if (
          typeof cfg.syncFromDate === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(cfg.syncFromDate)
        ) {
          syncFromDate = cfg.syncFromDate;
        } else if (
          typeof cfg.syncDaysBack === "number" &&
          cfg.syncDaysBack >= 1
        ) {
          const d = new Date();
          d.setDate(d.getDate() - cfg.syncDaysBack);
          syncFromDate = d.toISOString().slice(0, 10);
        }
        result.push({
          workspaceId: row.workspaceId,
          host: cfg.host,
          user: cfg.user,
          password: cfg.password,
          syncFromDate,
        });
      }
    }
    return result;
  },

  async getByWorkspaceAndType(
    workspaceId: string,
    integrationType: IntegrationType,
  ): Promise<{
    enabled: boolean;
    config: FtpIntegrationConfig | Record<string, unknown>;
  } | null> {
    const result = await db
      .select()
      .from(schema.workspaceIntegrations)
      .where(
        and(
          eq(schema.workspaceIntegrations.workspaceId, workspaceId),
          eq(schema.workspaceIntegrations.integrationType, integrationType),
        ),
      )
      .limit(1);

    const row = result[0];
    if (!row) return null;

    return {
      enabled: row.enabled,
      config: (row.config ?? {}) as
        | FtpIntegrationConfig
        | Record<string, unknown>,
    };
  },

  async upsert(
    workspaceId: string,
    integrationType: IntegrationType,
    enabled: boolean,
    config: FtpIntegrationConfig | Record<string, unknown>,
  ): Promise<boolean> {
    const existing = await db
      .select()
      .from(schema.workspaceIntegrations)
      .where(
        and(
          eq(schema.workspaceIntegrations.workspaceId, workspaceId),
          eq(schema.workspaceIntegrations.integrationType, integrationType),
        ),
      )
      .limit(1);

    const now = new Date();

    if (existing[0]) {
      const result = await db
        .update(schema.workspaceIntegrations)
        .set({ enabled, config, updatedAt: now })
        .where(
          and(
            eq(schema.workspaceIntegrations.workspaceId, workspaceId),
            eq(schema.workspaceIntegrations.integrationType, integrationType),
          ),
        );
      return (result.rowCount ?? 0) > 0;
    }

    await db.insert(schema.workspaceIntegrations).values({
      workspaceId,
      integrationType,
      enabled,
      config,
      updatedAt: now,
    });
    return true;
  },

  async setEnabled(
    workspaceId: string,
    integrationType: IntegrationType,
    enabled: boolean,
  ): Promise<boolean> {
    const result = await db
      .update(schema.workspaceIntegrations)
      .set({ enabled, updatedAt: new Date() })
      .where(
        and(
          eq(schema.workspaceIntegrations.workspaceId, workspaceId),
          eq(schema.workspaceIntegrations.integrationType, integrationType),
        ),
      );
    return (result.rowCount ?? 0) > 0;
  },

  /** Зашифрованный токен бота (telegram/max) */
  async getBotToken(
    workspaceId: string,
    integrationType: "telegram" | "max",
  ): Promise<string | null> {
    try {
      if (!workspaceId?.trim()) {
        console.error("Некорректный workspaceId передан в getBotToken");
        return null;
      }

      if (!["telegram", "max"].includes(integrationType)) {
        console.error(`Некорректный тип интеграции: ${integrationType}`);
        return null;
      }

      const row = await db
        .select({ config: schema.workspaceIntegrations.config })
        .from(schema.workspaceIntegrations)
        .where(
          and(
            eq(schema.workspaceIntegrations.workspaceId, workspaceId),
            eq(schema.workspaceIntegrations.integrationType, integrationType),
          ),
        )
        .limit(1);

      const cfg = row[0]?.config as { botToken?: string } | undefined;
      const token = cfg?.botToken?.trim() || null;

      if (token) {
        console.debug(
          `Найден токен бота для ${integrationType} в workspace ${workspaceId}`,
        );
      } else {
        console.debug(
          `Токен бота не найден для ${integrationType} в workspace ${workspaceId}`,
        );
      }

      return token;
    } catch (error) {
      console.error(
        `Ошибка получения токена бота для ${integrationType} в workspace ${workspaceId}:`,
        error,
      );
      return null;
    }
  },

  /** Сохранить зашифрованный токен бота */
  async upsertBotToken(
    workspaceId: string,
    integrationType: "telegram" | "max",
    encryptedToken: string,
    description?: string,
  ): Promise<boolean> {
    try {
      if (!workspaceId?.trim()) {
        console.error("Некорректный workspaceId передан в upsertBotToken");
        return false;
      }

      if (!["telegram", "max"].includes(integrationType)) {
        console.error(`Некорректный тип интеграции: ${integrationType}`);
        return false;
      }

      // Проверка формата зашифрованного токена (должна быть непустая строка)
      if (typeof encryptedToken !== "string") {
        console.error(
          `Некорректный тип зашифрованного токена для ${integrationType} в workspace ${workspaceId}`,
        );
        return false;
      }

      // Пустая строка допустима (означает удаление токена)
      if (!encryptedToken.trim()) {
        console.log(
          `Удаление токена бота для ${integrationType} в workspace ${workspaceId}`,
        );
      } else {
        // Валидация зашифрованного токена: префикс enc: + base64
        if (!isEncryptedTokenValid(encryptedToken)) {
          console.error(
            `Некорректный формат зашифрованного токена для ${integrationType} в workspace ${workspaceId}`,
          );
          return false;
        }
        console.log(
          `Обновление токена бота для ${integrationType} в workspace ${workspaceId}`,
        );
      }

      const config: Record<string, unknown> = {
        botToken: encryptedToken,
        ...(description != null && { description }),
      };
      const result = await this.upsert(
        workspaceId,
        integrationType,
        Boolean(encryptedToken.trim()),
        config,
      );

      if (result) {
        console.log(
          `Токен бота успешно сохранён для ${integrationType} в workspace ${workspaceId}`,
        );
      } else {
        console.error(
          `Не удалось сохранить токен бота для ${integrationType} в workspace ${workspaceId}`,
        );
      }

      return result;
    } catch (error) {
      console.error(
        `Ошибка сохранения токена бота для ${integrationType} в workspace ${workspaceId}:`,
        error,
      );
      return false;
    }
  },

  /** Workspace IDs с настроенным Telegram ботом */
  async findWorkspaceIdsWithTelegramBot(): Promise<string[]> {
    const rows = await db
      .select({
        workspaceId: schema.workspaceIntegrations.workspaceId,
        config: schema.workspaceIntegrations.config,
      })
      .from(schema.workspaceIntegrations)
      .where(
        and(
          eq(schema.workspaceIntegrations.integrationType, "telegram"),
          eq(schema.workspaceIntegrations.enabled, true),
        ),
      );

    return rows
      .filter((r) => {
        const cfg = r.config as { botToken?: string } | undefined;
        return cfg?.botToken?.trim();
      })
      .map((r) => r.workspaceId);
  },
};

export type WorkspaceIntegrationsRepository =
  typeof workspaceIntegrationsRepository;
