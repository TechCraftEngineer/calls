# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Set build-time arguments for Next.js (NEXT_PUBLIC_* встраиваются в клиентский бандл)
# API: same origin (client) или APP_SERVER_URL (server), NEXT_PUBLIC_API_URL не нужен
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# Build Next.js application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

# Install wget for healthcheck
RUN apk add --no-cache wget

WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

