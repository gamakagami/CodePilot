##############################
# 1. BUILD STAGE
##############################
FROM node:18-slim AS builder

WORKDIR /app

ARG CACHEBUST=1

# Copy package files and Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies)
RUN npm ci --include=dev

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

# Copy package files and Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install ONLY production dependencies
RUN npm ci --only=production

# Generate Prisma client in production image
RUN npx prisma generate

# Copy built files and Prisma engine from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Expose service port
EXPOSE 4002

# Start the application
CMD ["node", "dist/main.js"]
