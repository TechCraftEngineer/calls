import slugify from "@sindresorhus/slugify";

const WORKSPACE_SLUG_MAX_LENGTH = 50;
const WORKSPACE_SLUG_FALLBACK = "workspace";

/**
 * Генерирует slug для workspace из названия.
 * Поддерживает кириллицу и другие языки через transliteration.
 */
export function generateWorkspaceSlug(name: string): string {
  const slug = slugify(name, {
    separator: "-",
    lowercase: true,
    decamelize: true,
  });
  const trimmed = slug.slice(0, WORKSPACE_SLUG_MAX_LENGTH).replace(/^-|-$/g, "");
  return trimmed || WORKSPACE_SLUG_FALLBACK;
}
