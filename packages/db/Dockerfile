FROM oven/bun:1.3.10-alpine AS base
RUN apk update
RUN apk add --no-cache libc6-compat

WORKDIR /app

FROM base AS prepare
RUN bun add -g turbo@2.8.17
COPY . .
RUN turbo prune @calls/db --docker

FROM base AS builder
COPY --from=prepare /app/out/json/ .

RUN bun install --ignore-scripts

COPY --from=prepare /app/out/full/ .

ENV TURBO_TELEMETRY_DISABLED=1

FROM base AS runner
ENV POSTGRES_URL=postgres://postgres:password@postgres:5432/acme

COPY --from=builder /app .

CMD ["bun", "run", "--cwd", "packages/db", "migrate"]
