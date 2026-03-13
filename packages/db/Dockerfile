FROM oven/bun:1-alpine

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./
COPY packages/db/package.json ./packages/db/
COPY packages/config/package.json ./packages/config/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY packages/db/src ./packages/db/src
COPY packages/config/src ./packages/config/src
COPY drizzle.config.ts ./

# Set environment
ENV POSTGRES_URL=postgres://postgres:password@postgres:5432/acme

# Run migrations
CMD ["bun", "run", "drizzle-kit", "migrate"]
