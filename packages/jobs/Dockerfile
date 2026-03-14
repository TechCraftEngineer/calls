FROM oven/bun:1-alpine

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./
COPY packages/jobs/package.json ./packages/jobs/
COPY packages/db/package.json ./packages/db/
COPY packages/config/package.json ./packages/config/
COPY tooling/typescript/package.json ./tooling/typescript/

# Install dependencies (без --frozen: только subset пакетов)
RUN bun install

# Copy source code
COPY packages/jobs/src ./packages/jobs/src
COPY packages/db/src ./packages/db/src
COPY packages/config/src ./packages/config/src
COPY tooling/typescript/*.json ./tooling/typescript/

# Create records directory (Megafon FTP sync destination)
RUN mkdir -p /app/records

ENV JOBS_PORT=8000
ENV DEPLOYMENT_ENV=docker

EXPOSE 8000

# Run directly — env vars passed via docker-compose
CMD ["bun", "./packages/jobs/src/server.ts"]
