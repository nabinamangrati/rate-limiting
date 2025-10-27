# Multi-stage build for optimized production image
FROM node:24-alpine AS dependencies

# Install pnpm globally
RUN npm install -g pnpm

# Install system dependencies for Prisma
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy pnpm files
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Install all dependencies (including dev dependencies for build)
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN pnpm exec prisma generate

# Build stage
FROM node:24-alpine AS build

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR /app

# Copy dependencies and generated Prisma client
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/prisma ./prisma

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Production stage
FROM node:24-alpine AS production

# Install pnpm globally
RUN npm install -g pnpm

# Install system dependencies for Prisma
RUN apk add --no-cache libc6-compat openssl curl

WORKDIR /app

# Copy pnpm files
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Install only production dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client for production
RUN pnpm exec prisma generate

# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Create uploads directory for PDFs with proper permissions
RUN mkdir -p /app/uploads && \
    chown -R node:node /app && \
    chmod 755 /app/uploads

# Switch to non-root user
USER node

# Expose the port
EXPOSE 5588

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5588/api/v1/rag/health || exit 1

# Start the application
CMD ["node", "dist/main.js"]