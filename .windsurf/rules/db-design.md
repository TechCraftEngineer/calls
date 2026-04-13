---
applyTo: "packages/db/**/*"
---

Правила проектирования баз данных, моделирования данных и нормализации для обеспечения целостности данных.

## Key Principles

- Проектировать для data integrity first
- Нормализовать для уменьшения избыточности
- Денормализовать для производительности (осознанно)
- Использовать consistent naming conventions
- Документировать схему

## Normalization Forms

- 1NF: Atomic values, unique rows
- 2NF: No partial dependencies (composite keys)
- 3NF: No transitive dependencies
- BCNF: Stricter 3NF
- 4NF/5NF: Handling multi-valued dependencies

## Modeling Techniques

- Entity-Relationship (ER) Diagrams
- Identify Entities, Attributes, Relationships
- Define Cardinality (1:1, 1:N, M:N)
- Define Keys (Primary, Foreign, Composite, Surrogate)
- Handle Inheritance (Single Table, Class Table)

## Denormalization Strategies

- Pre-computed aggregates
- Materialized Views
- Redundant columns для read speed
- JSON columns для flexibility
- Caching layers

## Naming Conventions

- Tables: Plural или Singular (быть последовательным, например, users)
- Columns: snake_case (user_id, created_at)
- Keys: pk_table, fk_table_column
- Indexes: idx_table_column

## Best Practices

- Использовать standard ISO 8601 для dates
- Использовать UTC для timestamps
- Избегать reserved words
- Планировать schema evolution
- Валидировать данные на уровне application AND database
- Учитывать GDPR/Privacy в design
