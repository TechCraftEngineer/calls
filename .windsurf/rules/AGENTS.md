---
applyTo: "apps/app/**/*"
---

Правила создания доступных, быстрых и привлекательных пользовательских интерфейсов. Используй MUST/SHOULD/NEVER для руководства.

## Interactions

- Keyboard
  - MUST: Полная поддержка клавиатуры согласно [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/)
  - MUST: Видимые focus ring (`:focus-visible`; группировать с `:focus-within`)
  - MUST: Управление фокусом (trap, move, return) по APG паттернам
- Targets & input
  - MUST: Hit target ≥24px (mobile ≥44px). Если визуально меньше — расширить hit area
  - MUST: Mobile `<input>` font-size ≥16px или установить:
    ```html
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
    ```
  - NEVER: Отключать browser zoom
  - MUST: `touch-action: manipulation` для предотвращения double-tap zoom; настроить `-webkit-tap-highlight-color`
- Inputs & forms (behavior)
  - MUST: Hydration-safe inputs (не терять фокус/значение)
  - NEVER: Блокировать paste в `<input>/<textarea>`
  - MUST: Loading buttons показывать спиннер и сохранять оригинальный label
  - MUST: Enter отправляет focused text input. В `<textarea>` — ⌘/Ctrl+Enter отправляет; Enter добавляет newline
  - MUST: Keep submit enabled до начала запроса; затем disable, показать спиннер, использовать idempotency key
  - MUST: Не блокировать typing; принимать free text и валидировать после
  - MUST: Разрешать отправку incomplete forms для показа валидации
  - MUST: Errors inline рядом с полями; при submit — focus first error
  - MUST: `autocomplete` + осмысленный `name`; корректный `type` и `inputmode`
  - SHOULD: Отключать spellcheck для emails/codes/usernames
  - SHOULD: Placeholders заканчиваться ellipsis и показывать example pattern (например, `+1 (123) 456-7890`, `sk-012345…`)
  - MUST: Предупреждать об unsaved changes перед навигацией
  - MUST: Совместимость с password managers & 2FA; разрешать paste one-time codes
  - MUST: Trim значения для обработки trailing spaces
  - MUST: Нет dead zones на checkboxes/radios; label+control — один generous hit target
- State & navigation
  - MUST: URL отражает state (deep-link filters/tabs/pagination/expanded panels). Предпочитать библиотеки типа [nuqs](https://nuqs.dev)
  - MUST: Back/Forward восстанавливает scroll
  - MUST: Links are links — использовать `<a>/<Link>` для навигации (поддержка Cmd/Ctrl/middle-click)
- Feedback
  - SHOULD: Optimistic UI; reconcile on response; при failure показать error и rollback или предложить Undo
  - MUST: Подтверждать destructive actions или предоставлять Undo window
  - MUST: Использовать polite `aria-live` для toasts/inline validation
  - SHOULD: Ellipsis (`…`) для опций, открывающих follow-ups (например, "Rename…") и loading states (например, "Loading…", "Saving…", "Generating…")
- Touch/drag/scroll
  - MUST: Проектировать forgiving interactions (generous targets, clear affordances; избегать finickiness)
  - MUST: Задержка first tooltip в группе; последующие — без задержки
  - MUST: Intentional `overscroll-behavior: contain` в modals/drawers
  - MUST: Во время drag отключать text selection и установить `inert` на dragged element/containers
  - MUST: Нет "dead-looking" interactive zones — если выглядит кликабельным, оно кликабельно
- Autofocus
  - SHOULD: Autofocus на desktop при наличии single primary input; редко на mobile (избегать layout shift)

## Animation

- MUST: Уважать `prefers-reduced-motion` (предоставлять reduced variant)
- SHOULD: Предпочитать CSS > Web Animations API > JS libraries
- MUST: Анимировать compositor-friendly props (`transform`, `opacity`); избегать layout/repaint props (`top/left/width/height`)
- SHOULD: Анимировать только для clarify cause/effect или add deliberate delight
- SHOULD: Выбирать easing в соответствии с изменением (size/distance/trigger)
- MUST: Анимации должны быть interruptible и input-driven (избегать autoplay)
- MUST: Корректный `transform-origin` (motion starts where it "physically" should)

## Layout

- SHOULD: Optical alignment; корректировать на ±1px когда perception beats geometry
- MUST: Deliberate alignment to grid/baseline/edges/optical centers — no accidental placement
- SHOULD: Balance icon/text lockups (stroke/weight/size/spacing/color)
- MUST: Проверять mobile, laptop, ultra-wide (симулировать ultra-wide на 50% zoom)
- MUST: Уважать safe areas (использовать env(safe-area-inset-*))
- MUST: Избегать unwanted scrollbars; исправлять overflows

## Content & Accessibility

- SHOULD: Inline help first; tooltips — last resort
- MUST: Skeletons mirror final content для избежания layout shift
- MUST: `<title>` соответствует текущему контексту
- MUST: Нет dead ends; всегда предлагать next step/recovery
- MUST: Проектировать empty/sparse/dense/error states
- SHOULD: Curly quotes (" "); избегать widows/orphans
- MUST: Tabular numbers для comparisons (`font-variant-numeric: tabular-nums` или mono типа Geist Mono)
- MUST: Redundant status cues (не только цветом); иконки имеют текстовые labels
- MUST: Не показывать схему напрямую — visuals могут опускать labels, но accessible names должны существовать
- MUST: Использовать ellipsis character `…` (не три точки)
- MUST: `scroll-margin-top` на headings для anchored links; включать "Skip to content" link; hierarchical `<h1–h6>`
- MUST: Resilient to user-generated content (short/avg/very long)
- MUST: Locale-aware dates/times/numbers/currency
- MUST: Точные имена (`aria-label`), декоративные элементы — `aria-hidden`, проверять в Accessibility Tree
- MUST: Icon-only buttons имеют descriptive `aria-label`
- MUST: Предпочитать native semantics (`button`, `a`, `label`, `table`) перед ARIA
- SHOULD: Right-clicking на nav logo показывает brand assets
- MUST: Использовать non-breaking spaces для склеивания терминов: `10&nbsp;MB`, `⌘&nbsp;+&nbsp;K`, `Vercel&nbsp;SDK`

## Performance

- SHOULD: Тестировать iOS Low Power Mode и macOS Safari
- MUST: Измерять надежно (отключать расширения, искажающие runtime)
- MUST: Отслеживать и минимизировать re-renders (React DevTools/React Scan)
- MUST: Профилировать с CPU/network throttling
- MUST: Batch layout reads/writes; избегать ненужных reflows/repaints
- MUST: Mutations (`POST/PATCH/DELETE`) целевые <500 ms
- SHOULD: Предпочитать uncontrolled inputs; делать controlled loops дешевыми (keystroke cost)
- MUST: Виртуализировать large lists (например, `virtua`)
- MUST: Preload только above-the-fold images; lazy-load остальные
- MUST: Предотвращать CLS от images (explicit dimensions или reserved space)

## Design

- SHOULD: Layered shadows (ambient + direct)
- SHOULD: Crisp edges через semi-transparent borders + shadows
- SHOULD: Nested radii: child ≤ parent; concentric
- SHOULD: Hue consistency: tint borders/shadows/text toward bg hue
- MUST: Accessible charts (color-blind-friendly palettes)
- MUST: Соответствовать contrast — предпочитать [APCA](https://apcacontrast.com/) над WCAG 2
- MUST: Увеличивать contrast на `:hover/:active/:focus`
- SHOULD: Match browser UI to bg
- SHOULD: Избегать gradient banding (использовать masks при необходимости)
