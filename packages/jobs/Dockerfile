FROM oven/bun:1.3.11-alpine AS base
RUN apk update
RUN apk add --no-cache libc6-compat ffmpeg

WORKDIR /app

FROM base AS prepare
RUN bun add -g turbo@2.9.4
COPY . .
RUN turbo prune @calls/jobs --docker

FROM base AS builder
COPY --from=prepare /app/out/json/ .

RUN bun install --ignore-scripts

COPY --from=prepare /app/out/full/ .

ENV TURBO_TELEMETRY_DISABLED=1

# Build jobs and its dependencies
RUN bunx turbo run build --filter=@calls/jobs...

FROM base AS runner
RUN mkdir -p /app/records

ENV JOBS_PORT=8000
ENV DEPLOYMENT_ENV=docker

EXPOSE 8000

COPY --from=builder /app .

WORKDIR /app/packages/jobs

CMD ["bun", "run", "start"]
