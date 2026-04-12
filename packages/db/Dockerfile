FROM oven/bun:1.3.11-alpine AS base
RUN apk update
RUN apk add --no-cache libc6-compat

WORKDIR /app

FROM base AS prepare
RUN bun add -g turbo@2.9.6
COPY . .
RUN turbo prune @calls/db --docker

FROM base AS builder
COPY --from=prepare /app/out/json/ .

RUN bun install --ignore-scripts

COPY --from=prepare /app/out/full/ .

ENV TURBO_TELEMETRY_DISABLED=1

FROM base AS runner
ARG POSTGRES_URL
ENV POSTGRES_URL=${POSTGRES_URL}

COPY --from=builder /app .

WORKDIR /app/packages/db
CMD ["bunx", "drizzle-kit", "migrate"]
