# CodePilot Local Setup Guide

This guide will walk you through setting up and running CodePilot on your local machine from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Cloning the Repository](#cloning-the-repository)
3. [Environment Variables Setup](#environment-variables-setup)
4. [Getting Required API Keys](#getting-required-api-keys)
5. [Running with Docker (Recommended)](#running-with-docker-recommended)
6. [Running Locally (Development)](#running-locally-development)
7. [Verifying the Setup](#verifying-the-setup)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed on your machine:

### Required Software

- **Git** - [Download Git](https://git-scm.com/downloads)
- **Docker Desktop** (version 20.10 or higher) - [Download Docker Desktop](https://www.docker.com/products/docker-desktop)
  - Includes Docker Compose (version 2.0 or higher)
- **Node.js** 18+ (only needed for local development without Docker) - [Download Node.js](https://nodejs.org/)

### System Requirements

- **Operating System**: Windows 10+, macOS, or Linux
- **RAM**: At least 8GB available for Docker
- **Disk Space**: At least 5GB free space
- **Internet Connection**: Required for downloading dependencies and Docker images

### Required Accounts & API Keys

You'll need accounts and API keys for the following services:

1. **GitHub** - For OAuth authentication
2. **Anthropic** - For AI-powered code analysis (Claude API)
3. **Pinecone** - For vector embeddings storage
4. **Upstash QStash** (optional) - For queue/job processing
5. **Cohere** (optional) - For additional AI features

---

## Cloning the Repository

1. **Open your terminal/command prompt**

2. **Navigate to the directory where you want to clone the project**
   ```bash
   cd /path/to/your/projects
   ```

3. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd codepilot
   ```
   
   > Replace `<repository-url>` with the actual repository URL (e.g., `https://github.com/username/codepilot.git`)

4. **Verify you're in the correct directory**
   ```bash
   ls -la  # On Linux/Mac
   dir     # On Windows
   ```
   
   You should see directories like `client`, `gateway`, `services`, `docker-compose.yml`, etc.

---

## Environment Variables Setup

All environment variables are configured in a `.env` file at the root of the project.

### Step 1: Create the .env File

Create a `.env` file in the root directory of the project:

```bash
# On Linux/Mac
touch .env

# On Windows (PowerShell)
New-Item -ItemType File -Path .env
```

### Step 2: Configure Environment Variables

Copy the following template into your `.env` file and fill in the values:

```env
# ============================================
# Application Configuration
# ============================================
NODE_ENV=development

# ============================================
# JWT & Authentication
# ============================================
# Generate a strong random string for JWT_SECRET
# You can use: openssl rand -base64 32 (on Linux/Mac)
# Or: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" (on any platform)
JWT_SECRET=your-super-secret-jwt-key-change-this-to-a-random-string

# ============================================
# GitHub OAuth Configuration
# ============================================
# Get these from: https://github.com/settings/developers
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
# Callback URL should match your GitHub OAuth app settings
GITHUB_REDIRECT_URI=http://localhost:4000/api/auth/github/callback

# ============================================
# Frontend Configuration
# ============================================
FRONTEND_URL=http://localhost:80
# For local development, you might want: http://localhost:3000

# ============================================
# AI Service API Keys
# ============================================
# Get from: https://console.anthropic.com/
ANTHROPIC_API_KEY=your-anthropic-api-key

# Get from: https://app.pinecone.io/
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX=code-analysis

# Optional: Get from: https://dashboard.cohere.com/
COHERE_API_KEY=your-cohere-api-key-optional

# ============================================
# Database Configuration (PostgreSQL)
# ============================================
# Auth Service Database
AUTH_POSTGRES_USER=postgres
AUTH_POSTGRES_PASSWORD=postgres
AUTH_POSTGRES_DB=auth_db
AUTH_POSTGRES_PORT=5432

# User Service Database
USER_POSTGRES_USER=userservice
USER_POSTGRES_PASSWORD=userservice_password
USER_POSTGRES_DB=userservice_db
USER_POSTGRES_PORT=5433

# Prediction Service Database
PREDICTION_POSTGRES_USER=predictionservice
PREDICTION_POSTGRES_PASSWORD=prediction_password
PREDICTION_POSTGRES_DB=prediction_db
PREDICTION_POSTGRES_PORT=5434

# ============================================
# Neo4j Configuration
# ============================================
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4j_password
NEO4J_HTTP_PORT=7474
NEO4J_BOLT_PORT=7687

# ============================================
# Service URLs (for local development)
# ============================================
AUTH_SERVICE_URL=http://localhost:4001
USER_SERVICE_URL=http://localhost:4002
ANALYSIS_SERVICE_URL=http://localhost:5003
PREDICTION_SERVICE_URL=http://localhost:5000
REVIEW_SERVICE_URL=http://localhost:6000
ORCHESTRATOR_SERVICE_URL=http://localhost:7000
QUEUE_SERVICE_URL=http://localhost:3000

# ============================================
# Service Ports
# ============================================
GATEWAY_PORT=4000
AUTH_SERVICE_PORT=4001
USER_SERVICE_PORT=4002
ANALYSIS_SERVICE_PORT=5003
PREDICTION_SERVICE_PORT=5000
REVIEW_SERVICE_PORT=6000
ORCHESTRATOR_SERVICE_PORT=7000
QUEUE_SERVICE_PORT=3000
CLIENT_PORT=80

# ============================================
# Queue Service (Upstash QStash) - Optional
# ============================================
# Get from: https://console.upstash.com/qstash
QSTASH_URL=https://qstash.upstash.io/v2/publish
QSTASH_TOKEN=your-qstash-token-optional
QSTASH_CURRENT_SIGNING_KEY=your-qstash-current-signing-key-optional
QSTASH_NEXT_SIGNING_KEY=your-qstash-next-signing-key-optional
BASE_URL=http://localhost:3000
MAX_RETRIES=3
RETRY_DELAY=2000
GITHUB_WEBHOOK_SECRET=your-github-webhook-secret-optional

# ============================================
# Client/Frontend Environment Variables
# ============================================
# Create a .env file in the client/ directory for frontend-specific vars
# VITE_API_URL=http://localhost:4000/api/
```

### Step 3: Client Environment Variables (Optional)

For local development, you may also want to create a `.env` file in the `client/` directory:

```bash
cd client
# Create .env file
```

Add the following:

```env
VITE_API_URL=http://localhost:4000/api/
```

---

## Getting Required API Keys

### 1. GitHub OAuth App Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"New OAuth App"**
3. Fill in the application details:
   - **Application name**: CodePilot (or any name you prefer)
   - **Homepage URL**: `http://localhost:80` (or `http://localhost:3000` for local dev)
   - **Authorization callback URL**: `http://localhost:4000/api/auth/github/callback`
4. Click **"Register application"**
5. Copy the **Client ID** and generate a **Client Secret**
6. Add these to your `.env` file:
   ```env
   GITHUB_CLIENT_ID=your-client-id-here
   GITHUB_CLIENT_SECRET=your-client-secret-here
   ```

### 2. Anthropic API Key

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to **API Keys** section
4. Create a new API key
5. Copy the key and add to your `.env`:
   ```env
   ANTHROPIC_API_KEY=sk-ant-...
   ```

### 3. Pinecone API Key

1. Go to [Pinecone Console](https://app.pinecone.io/)
2. Sign up or log in
3. Go to **API Keys** section
4. Create a new API key
5. Create an index named `code-analysis` (or use your preferred name)
6. Copy the key and add to your `.env`:
   ```env
   PINECONE_API_KEY=your-pinecone-api-key
   PINECONE_INDEX=code-analysis
   ```

### 4. Upstash QStash (Optional - for Queue Service)

1. Go to [Upstash Console](https://console.upstash.com/)
2. Sign up or log in
3. Create a new QStash project
4. Get your QStash token and signing keys
5. Add to your `.env`:
   ```env
   QSTASH_TOKEN=your-qstash-token
   QSTASH_CURRENT_SIGNING_KEY=your-signing-key
   QSTASH_NEXT_SIGNING_KEY=your-next-signing-key
   ```

### 5. Cohere API Key (Optional)

1. Go to [Cohere Dashboard](https://dashboard.cohere.com/)
2. Sign up or log in
3. Navigate to **API Keys**
4. Create a new API key
5. Add to your `.env`:
   ```env
   COHERE_API_KEY=your-cohere-api-key
   ```

### 6. Generate JWT Secret

Generate a secure random string for `JWT_SECRET`:

**On Linux/Mac:**
```bash
openssl rand -base64 32
```

**On Windows (PowerShell):**
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**On Windows (Command Prompt):**
```cmd
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output and add it to your `.env` file.

---

## Running with Docker (Recommended)

Docker is the easiest way to run CodePilot as it handles all dependencies and services automatically.

### Step 1: Start Docker Desktop

Make sure Docker Desktop is running on your machine.

### Step 2: Verify Docker is Running

```bash
docker --version
docker-compose --version
```

Both commands should return version numbers.

### Step 3: Build and Start All Services

From the root directory of the project:

```bash
# Build all Docker images (first time only, or after code changes)
docker-compose build

# Start all services in detached mode
docker-compose up -d
```

This will:
- Pull required Docker images (PostgreSQL, Neo4j, etc.)
- Build Docker images for all services
- Start all services in the correct order
- Run database migrations automatically
- Set up networking between services

### Step 4: Check Service Status

```bash
# Check if all services are running
docker-compose ps

# View logs from all services
docker-compose logs -f

# View logs from a specific service
docker-compose logs -f auth-service
docker-compose logs -f gateway
docker-compose logs -f client
```

### Step 5: Access the Application

Once all services are running:

- **Frontend**: http://localhost (or http://localhost:80)
- **API Gateway**: http://localhost:4000
- **Health Check**: http://localhost:4000/health

### Step 6: Stop Services

When you're done:

```bash
# Stop all services (keeps data)
docker-compose down

# Stop and remove volumes (deletes all data)
docker-compose down -v
```

---

## Running Locally (Development)

If you prefer to run services locally without Docker (useful for development):

### Prerequisites

- Node.js 18+ installed
- PostgreSQL installed and running (for auth, user, and prediction services)
- Neo4j installed and running (for code analysis service)
- Python 3.x (for failure prediction service ML model)

### Step 1: Install Dependencies

Install dependencies for each service:

```bash
# Install gateway dependencies
cd gateway
npm install
cd ..

# Install client dependencies
cd client
npm install
cd ..

# Install auth-service dependencies
cd services/auth-service
npm install
cd ../..

# Install user-service dependencies
cd services/user-service
npm install
cd ../..

# Install code-analysis-service dependencies
cd services/code-analysis-service
npm install
cd ../..

# Install failure-prediction-service dependencies
cd services/failure-prediction-service
npm install
cd ../..

# Install review-comment-service dependencies
cd services/review-comment-service
npm install
cd ../..

# Install orchestrator-service dependencies
cd services/orchestrator-service
npm install
cd ../..

# Install queue-service dependencies
cd services/queue-service
npm install
cd ../..
```

### Step 2: Set Up Databases

#### PostgreSQL Setup

1. **Create databases** for each service:
   ```sql
   CREATE DATABASE auth_db;
   CREATE DATABASE userservice_db;
   CREATE DATABASE prediction_db;
   ```

2. **Update `.env` file** with your local PostgreSQL connection strings:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/auth_db
   ```

#### Neo4j Setup

1. Install and start Neo4j (see [Neo4j Installation Guide](https://neo4j.com/docs/operations-manual/current/installation/))
2. Update Neo4j credentials in `.env` if different from defaults

### Step 3: Run Database Migrations

```bash
# Auth Service
cd services/auth-service
npx prisma migrate dev
npx prisma generate
cd ../..

# User Service
cd services/user-service
npx prisma migrate dev
npx prisma generate
cd ../..

# Failure Prediction Service
cd services/failure-prediction-service
npx prisma migrate dev
npx prisma generate
cd ../..
```

### Step 4: Start Services

You'll need multiple terminal windows/tabs. Start services in this order:

**Terminal 1 - Gateway:**
```bash
cd gateway
npm run dev
```

**Terminal 2 - Client:**
```bash
cd client
npm run dev
```

**Terminal 3 - Auth Service:**
```bash
cd services/auth-service
npm run dev
```

**Terminal 4 - User Service:**
```bash
cd services/user-service
npm run dev
```

**Terminal 5 - Code Analysis Service:**
```bash
cd services/code-analysis-service
npm run dev
```

**Terminal 6 - Failure Prediction Service:**
```bash
cd services/failure-prediction-service
npm run dev
```

**Terminal 7 - Review Comment Service:**
```bash
cd services/review-comment-service
npm run dev
```

**Terminal 8 - Orchestrator Service:**
```bash
cd services/orchestrator-service
npm run dev
```

**Terminal 9 - Queue Service (optional):**
```bash
cd services/queue-service
npm run dev
```

---

## Verifying the Setup

### 1. Check Service Health

```bash
# If using Docker
docker-compose ps

# Check gateway health
curl http://localhost:4000/health

# Check auth service health
curl http://localhost:4001/health
```

All services should return a healthy status.

### 2. Access the Frontend

1. Open your browser and go to http://localhost (or http://localhost:3000 if running locally)
2. You should see the CodePilot landing page
3. Click "Get Started" or "Login"
4. You should be redirected to GitHub for OAuth

### 3. Test Authentication

1. Complete GitHub OAuth flow
2. You should be redirected back to the application
3. Check browser console for any errors
4. Verify you can access the dashboard

### 4. Check Logs

Monitor logs to ensure everything is working:

```bash
# Docker logs
docker-compose logs -f

# Check for errors
docker-compose logs | grep -i error
```

---

## Troubleshooting

### Services Won't Start

**Issue**: Services fail to start or crash immediately

**Solutions**:
1. Check Docker has enough resources (at least 8GB RAM allocated)
2. Verify all environment variables are set correctly
3. Check logs: `docker-compose logs <service-name>`
4. Ensure ports are not already in use:
   ```bash
   # On Linux/Mac
   lsof -i :4000
   
   # On Windows
   netstat -ano | findstr :4000
   ```

### Database Connection Errors

**Issue**: Services can't connect to databases

**Solutions**:
1. Verify database containers are running: `docker-compose ps`
2. Check database credentials in `.env` match docker-compose.yml
3. Wait for databases to be healthy before services start (Docker handles this automatically)
4. For local setup, ensure PostgreSQL/Neo4j are running

### GitHub OAuth Not Working

**Issue**: GitHub OAuth redirect fails or returns errors

**Solutions**:
1. Verify `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are correct
2. Ensure `GITHUB_REDIRECT_URI` matches your GitHub OAuth app settings exactly
3. Check the callback URL is: `http://localhost:4000/api/auth/github/callback`
4. Review GitHub OAuth app settings in GitHub Developer Settings

### API Key Errors

**Issue**: Services complain about missing API keys

**Solutions**:
1. Verify all required API keys are in `.env` file
2. Check for typos in variable names
3. Ensure API keys are valid and not expired
4. Check service logs for specific error messages

### Port Already in Use

**Issue**: Error about ports already being in use

**Solutions**:
1. Change ports in `.env` file:
   ```env
   GATEWAY_PORT=4001
   AUTH_SERVICE_PORT=4002
   # etc.
   ```
2. Or stop the service using the port:
   ```bash
   # Find process using port (Linux/Mac)
   lsof -ti:4000 | xargs kill
   
   # Windows
   netstat -ano | findstr :4000
   taskkill /PID <PID> /F
   ```

### Docker Build Fails

**Issue**: `docker-compose build` fails

**Solutions**:
1. Check Docker Desktop is running
2. Ensure you have enough disk space
3. Try cleaning Docker cache:
   ```bash
   docker system prune -a
   ```
4. Rebuild specific service:
   ```bash
   docker-compose build <service-name>
   ```

### Frontend Not Loading

**Issue**: Frontend page is blank or shows errors

**Solutions**:
1. Check browser console for errors
2. Verify `VITE_API_URL` in client/.env matches your gateway URL
3. Check gateway is running and accessible
4. Clear browser cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Environment Variables Not Loading

**Issue**: Services can't read environment variables

**Solutions**:
1. Ensure `.env` file is in the root directory
2. Check for syntax errors in `.env` file (no spaces around `=`)
3. Verify variable names match exactly (case-sensitive)
4. Restart services after changing `.env`

---

## Next Steps

Once everything is running:

1. **Read the main README.md** for usage instructions
2. **Check DEPLOYMENT.md** for production deployment guidelines
3. **Explore the codebase** to understand the architecture
4. **Review API documentation** in the README
5. **Start analyzing pull requests!**

---

## Getting Help

If you encounter issues not covered here:

1. Check the main [README.md](./README.md) for more information
2. Review [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment-specific help
3. Check service logs: `docker-compose logs <service-name>`
4. Open an issue on GitHub with:
   - Your operating system
   - Docker version
   - Error messages from logs
   - Steps to reproduce

---

**Happy coding! 🚀**

