FROM oven/bun:1-alpine

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./
COPY apps/backend-server/package.json ./apps/backend-server/
COPY packages/backend-api/package.json ./packages/backend-api/
COPY packages/backend-storage/package.json ./packages/backend-storage/
COPY packages/db/package.json ./packages/db/
COPY packages/config/package.json ./packages/config/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY apps/backend-server/src ./apps/backend-server/src
COPY packages/backend-api/src ./packages/backend-api/src
COPY packages/backend-storage/src ./packages/backend-storage/src
COPY packages/db/src ./packages/db/src
COPY packages/config/src ./packages/config/src
COPY tsconfig.json ./

# Create necessary directories
RUN mkdir -p /app/data /app/logs /app/records

# Set environment
ENV POSTGRES_URL=postgres://postgres:password@postgres:5432/acme
ENV BACKEND_PORT=8000
ENV CORS_ORIGINS=http://localhost:3000
ENV DEPLOYMENT_ENV=docker

# Expose port
EXPOSE 8000

# Start the server
CMD ["bun", "run", "start"]
