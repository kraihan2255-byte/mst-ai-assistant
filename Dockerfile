# ==============================================================================
# MST Tengapal — Production Multi-Stage Dockerfile (Railway / Render / Cloud)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build React 19 Frontend
# ------------------------------------------------------------------------------
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Build NestJS Backend
# ------------------------------------------------------------------------------
FROM node:22-alpine AS backend-builder
WORKDIR /app/backend

# Install build dependencies for Argon2 native bindings
RUN apk add --no-cache python3 make g++

COPY backend/package*.json ./
RUN npm install

COPY backend/prisma ./prisma
RUN npx prisma generate

COPY backend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 3: Production Runtime Environment
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

# OpenSSL is required for Prisma database client
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV FRONTEND_DIR=/app/frontend/dist
ENV PORT=3000

# Copy backend package manifests and install production dependencies
COPY backend/package*.json ./
COPY backend/tsconfig.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy Prisma schema and generate client
COPY backend/prisma ./prisma
RUN npx prisma generate

# Copy compiled backend
COPY --from=backend-builder /app/backend/dist ./dist

# Copy compiled frontend PWA assets
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy startup entrypoint
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
