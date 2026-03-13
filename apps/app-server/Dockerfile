FROM oven/bun:1-alpine

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./
COPY apps/app-server/package.json ./apps/app-server/
COPY packages/api/package.json ./packages/api/
COPY packages/db/package.json ./packages/db/
COPY packages/config/package.json ./packages/config/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY apps/app-server/src ./apps/app-server/src
COPY packages/api/src ./packages/api/src
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
