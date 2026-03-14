/**
 * Константы для пагинации
 */

export const PAGINATION_CONSTANTS = {
  /** Количество элементов на странице по умолчанию */
  DEFAULT_PER_PAGE: 15,
  /** Максимальное количество страниц для отображения в пагинации */
  MAX_VISIBLE_PAGES: 5,
  /** Дебаунс для поиска в миллисекундах */
  SEARCH_DEBOUNCE_MS: 500,
} as const;
