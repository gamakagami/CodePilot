##############################
# 1. BUILD STAGE
##############################
FROM node:18-slim AS builder

WORKDIR /app

# Prevent Docker cache issues when dependencies change
ARG CACHEBUST=1

# Copy package files first
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
FROM node:18-slim

WORKDIR /app

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

# Start the service (your entrypoint)
CMD ["node", "dist/main.js"]
