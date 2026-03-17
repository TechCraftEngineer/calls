FROM oven/bun:1-alpine

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./
COPY packages/db/package.json ./packages/db/
COPY packages/config/package.json ./packages/config/
COPY packages/lib/package.json ./packages/lib/
COPY tooling/typescript/package.json ./tooling/typescript/

# Install dependencies
RUN bun install

# Copy source code and migrations
COPY packages/db/src ./packages/db/src
COPY packages/db/drizzle ./packages/db/drizzle
COPY packages/config/src ./packages/config/src
COPY packages/db/drizzle.config.ts ./

# Set environment
ENV POSTGRES_URL=postgres://postgres:password@postgres:5432/acme

# Run migrations
CMD ["bun", "run", "drizzle-kit", "migrate"]
