---
applyTo: "apps/app/**/*.tsx"
---

Правила разработки приложений на Next.js App Router, включая компоненты, маршрутизацию и оптимизацию.

## Key Principles

- Использовать Server Components по умолчанию
- Использовать Client Components только при необходимости (interactivity, hooks)
- Реализовывать правильные loading и error states
- Использовать Layouts для shared UI

## File Structure

- `page.tsx`: Unique UI for a route
- `layout.tsx`: Shared UI for a segment and its children
- `loading.tsx`: Loading UI for a segment
- `error.tsx`: Error UI for a segment
- `not-found.tsx`: Not found UI
- `route.ts`: API endpoints

## Server vs Client Components

- **Server Components (Default)**: Data fetching, backend resources, sensitive info, large dependencies
- **Client Components ('use client')**: Event listeners, useState/useEffect, browser APIs, custom hooks

## Data Fetching

- Fetch data в Server Components
- Использовать async/await directly в компонентах
- Использовать fetch с caching options
- Реализовывать Static Site Generation (SSG) по умолчанию
- Использовать Server Actions для mutations

## Best Practices

- **NEVER**: Хранить components в route directories — держать components отдельно от routes
- **NEVER**: Создавать _components folders внутри route directories
- Хранить shared components в src/components или dedicated component directories
- Использовать route groups ((folder)) для layout organization без изменения URL
- Оптимизировать metadata для SEO

## Component Size

- **NEVER**: Создавать large monolithic components (>150 lines)
- Разбивать complex UI на small, focused components
- Каждый component должен иметь single responsibility
- Extract reusable logic в custom hooks
- Держать render functions чистыми и читаемыми

## ReUI

> ReUI — first-class shadcn registry с enterprise-grade компонентами для shadcn, совместимыми с Base UI, Radix UI, Tailwind CSS v4.

### Base UI Components

- [Alert](https://reui.io/docs/components/base/alert): Callout для привлечения внимания (success, info, warning, error)
- [Autocomplete](https://reui.io/docs/components/base/autocomplete): Searchable select с autocomplete
- [Badge](https://reui.io/docs/components/base/badge): Status indicators и labels
- [Data Grid](https://reui.io/docs/components/base/data-grid): Advanced data table с sorting и filtering
- [Date Selector](https://reui.io/docs/components/base/date-selector): Multi-mode date и range selection
- [File Upload](https://reui.io/docs/components/base/file-upload): Drag and drop file uploading
- [Filters](https://reui.io/docs/components/base/filters): Multi-facet filtering interface
- [Frame](https://reui.io/docs/components/base/frame): Container с title и actions
- [Kanban](https://reui.io/docs/components/base/kanban): Drag and drop board для task management
- [Number Field](https://reui.io/docs/components/base/number-field): Specialized input для numeric data
- [Phone Input](https://reui.io/docs/components/base/phone-input): International phone number input
- [Rating](https://reui.io/docs/components/base/rating): Interactive star rating component
- [Scroll Area](https://reui.io/docs/components/base/scroll-area): Custom scrollbars для overflow content
- [Scrollspy](https://reui.io/docs/components/base/scrollspy): Navigation, отслеживающий scroll position
- [Sortable](https://reui.io/docs/components/base/sortable): Drag and drop list sorting
- [Stepper](https://reui.io/docs/components/base/stepper): Multi-step process indicator
- [Timeline](https://reui.io/docs/components/base/timeline): Chronological list of events
- [Tree](https://reui.io/docs/components/base/tree): Hierarchical data structure view
