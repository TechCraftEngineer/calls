import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Better Auth user table. Must match app-server auth config.
 *
 * Standard field names (OIDC/OpenID Connect, domain):
 * - given_name, family_name — OIDC standard (вместо first_name/last_name)
 * - internal_extensions — внутренние номера/расширения (телефония)
 * - mobile_phones — мобильные номера
 * - telegram_chat_id — Telegram API standard
 */
export const user = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    username: text("username"),
    bio: text("bio"),
    language: text("language").default("en"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    // additionalFields — OIDC + domain (TS: camelCase, DB: snake_case)
    givenName: text("given_name"),
    familyName: text("family_name"),
    internalExtensions: text("internal_extensions"),
    mobilePhones: text("mobile_phones"),
    telegramChatId: text("telegram_chat_id"),

    // Soft delete
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    usernameIdx: index("user_username_idx").on(table.username),
    emailIdx: index("user_email_idx").on(table.email),
    deletedAtIdx: index("user_deleted_at_idx").on(table.deletedAt),
  }),
);
