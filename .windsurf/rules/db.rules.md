---
applyTo: "packages/db/**/*"
---

Правила администрирования и разработки PostgreSQL баз данных, включая индексы, оптимизацию и лучшие практики.

## Key Principles

- Использовать строгую типизацию и constraints
- Использовать продвинутые фичи (JSONB, Arrays)
- Оптимизировать для concurrency (MVCC)
- Автоматизировать maintenance (VACUUM)
- Защищать data at rest и in transit

## Schema Design

- Использовать appropriate data types (UUID, TIMESTAMPTZ, TEXT)
- Использовать constraints (CHECK, UNIQUE, FOREIGN KEY)
- Использовать JSONB для semi-structured data
- Использовать partitioning для large tables
- Использовать schemas для logical separation

## Indexing

- B-Tree для general queries
- GIN для JSONB и text search
- GiST для geometric/network data
- BRIN для large, ordered datasets
- Partial indexes для specific conditions
- Multi-column indexes (order matters)

## Advanced Features

- Common Table Expressions (CTEs)
- Window Functions для analytics
- Full Text Search (tsvector, tsquery)
- Stored Procedures (PL/pgSQL)
- Triggers для automation
- Pub/Sub с LISTEN/NOTIFY

## Performance Tuning

- Анализировать queries с EXPLAIN (ANALYZE, BUFFERS)
- Настраивать configuration (shared_buffers, work_mem)
- Мониторить bloat и dead tuples
- Использовать connection pooling (PgBouncer)
- Оптимизировать autovacuum settings

## Best Practices

- Использовать transactions для atomicity
- Использовать migration tools (Flyway, Liquibase)
- Backup регулярно (WAL-G, pgBackRest)
- Мониторить slow queries (pg_stat_statements)
- Использовать role-based access control (RBAC)
