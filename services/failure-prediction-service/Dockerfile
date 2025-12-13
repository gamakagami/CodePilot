# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production stage - needs Python for ML model
FROM python:3.11-slim

# Install Node.js
RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create model directory (will be mounted as volume in docker-compose)
RUN mkdir -p ./src/model

# Install Python dependencies
RUN pip install --no-cache-dir \
    pandas==2.1.0 \
    scikit-learn==1.3.0 \
    numpy==1.24.3 \
    joblib==1.3.2

# Generate Prisma Client in production
RUN npx prisma generate

# Expose port
EXPOSE 5000

# Start the application
CMD ["node", "dist/main.js"]