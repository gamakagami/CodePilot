##############################
# 1. BUILD STAGE
##############################
FROM node:18-alpine AS builder

WORKDIR /app

# Prevent Docker cache issues when dependencies change
ARG CACHEBUST=1

# Copy package files first (best practice for caching)
COPY package*.json ./
COPY package-lock.json* ./

# Install ALL dependencies (including devDependencies)
RUN npm ci --include=dev

# Copy Prisma schema
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy the rest of the source code
COPY . .

# Build TypeScript
RUN npm run build



##############################
# 2. PRODUCTION STAGE
##############################
FROM node:18-alpine

WORKDIR /app

# Install wget for Railway health checks (optional)
RUN apk add --no-cache wget

# Copy package files
COPY package*.json ./
COPY package-lock.json* ./

# Install ONLY production dependencies
RUN npm ci --only=production

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy Prisma engine files
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Expose service port
EXPOSE 4001

# Start the service
CMD ["node", "dist/server.js"]
