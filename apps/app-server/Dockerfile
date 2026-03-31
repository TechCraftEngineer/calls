FROM oven/bun:1.3.11-alpine AS base
RUN apk update
RUN apk add --no-cache libc6-compat

WORKDIR /app

FROM base AS prepare
RUN bun add -g turbo@2.9.1
COPY . .
RUN turbo prune @calls/app-server --docker

FROM base AS builder
COPY --from=prepare /app/out/json/ .

RUN bun install --ignore-scripts

COPY --from=prepare /app/out/full/ .

ENV TURBO_TELEMETRY_DISABLED=1
RUN bun turbo run build --filter=@calls/app-server...

FROM base AS runner
RUN mkdir -p /app/data /app/logs /app/records

ENV BACKEND_PORT=8000
ENV DEPLOYMENT_ENV=docker

EXPOSE 8000

COPY --from=builder /app .

CMD ["bun", "./apps/app-server/dist/index.js"]
