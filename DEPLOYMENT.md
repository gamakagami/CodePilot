# CodePilot Deployment Guide

This guide will help you deploy the CodePilot application using Docker.

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)
- At least 8GB of RAM available for Docker
- Required API keys and secrets (see Environment Variables section)

## Quick Start

1. **Clone the repository** (if not already done)
   ```bash
   git clone <repository-url>
   cd codepilot
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

4. **Check service status**
   ```bash
   docker-compose ps
   ```

5. **View logs**
   ```bash
   docker-compose logs -f
   ```

## Environment Variables

Copy `.env.example` to `.env` and configure the following:

### Required Variables

- `JWT_SECRET` - A strong random string for JWT token signing
- `GITHUB_CLIENT_ID` - GitHub OAuth application client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth application client secret
- `GITHUB_REDIRECT_URI` - GitHub OAuth callback URL
- `ANTHROPIC_API_KEY` - Anthropic API key for AI features
- `PINECONE_API_KEY` - Pinecone API key for vector storage
- `COHERE_API_KEY` - Cohere API key (if used)

### Optional Variables

- Database credentials (defaults provided)
- Service ports (defaults provided)
- Qstash configuration (if using queue service)

## Service Architecture

The application consists of the following services:

- **client** (Port 80) - React frontend served by nginx
- **gateway** (Port 4000) - API gateway that routes requests to services
- **auth-service** (Port 4001) - Authentication service
- **user-service** (Port 4002) - User management service
- **analysis-service** (Port 5003) - Code analysis service
- **prediction-service** (Port 5000) - Failure prediction service
- **review-service** (Port 6000) - Code review service
- **orchestrator-service** (Port 7000) - Orchestration service
- **queue-service** (Port 3000) - Queue/background job service

### Databases

- **auth-postgres** - PostgreSQL for auth service
- **user-postgres** - PostgreSQL for user service
- **prediction-postgres** - PostgreSQL for prediction service
- **neo4j** - Neo4j graph database for code analysis

## Building Individual Services

To build a specific service:

```bash
docker-compose build <service-name>
```

For example:
```bash
docker-compose build auth-service
```

## Stopping Services

```bash
docker-compose down
```

To also remove volumes (⚠️ this will delete all data):
```bash
docker-compose down -v
```

## Health Checks

All services include health checks. You can verify service health:

```bash
# Check all services
docker-compose ps

# Check specific service logs
docker-compose logs <service-name>

# Test health endpoint
curl http://localhost:4000/health  # Gateway
curl http://localhost:4001/health  # Auth Service
```

## Database Migrations

Database migrations run automatically when services start. The services use Prisma migrations:

- Auth Service: Runs `npx prisma migrate deploy` on startup
- User Service: Runs `npx prisma migrate deploy` on startup
- Prediction Service: Runs `npx prisma migrate deploy` on startup

## Troubleshooting

### Services won't start

1. Check logs: `docker-compose logs <service-name>`
2. Verify environment variables are set correctly
3. Ensure ports are not already in use
4. Check Docker has enough resources allocated

### Database connection issues

1. Verify database containers are healthy: `docker-compose ps`
2. Check database credentials in `.env`
3. Ensure database health checks pass before services start

### Port conflicts

If ports are already in use, modify the port mappings in `docker-compose.yml` or set environment variables:
```bash
AUTH_SERVICE_PORT=4001
GATEWAY_PORT=4000
# etc.
```

### Out of memory

If services fail due to memory issues:
1. Increase Docker memory limit in Docker Desktop settings
2. Consider running services individually instead of all at once
3. Reduce Neo4j heap size if needed

## Production Deployment

For production deployment:

1. **Use strong secrets**: Generate strong random strings for `JWT_SECRET` and database passwords
2. **Use environment-specific configs**: Don't use default passwords in production
3. **Set up reverse proxy**: Use nginx or similar to handle SSL/TLS termination
4. **Configure backups**: Set up regular backups for PostgreSQL and Neo4j volumes
5. **Monitor resources**: Set up monitoring for CPU, memory, and disk usage
6. **Use secrets management**: Consider using Docker secrets or external secret management
7. **Enable logging**: Configure centralized logging for all services

## Scaling

To scale specific services:

```bash
docker-compose up -d --scale analysis-service=3
```

Note: Some services may require additional configuration for horizontal scaling.

## Network

All services are connected via the `codepilot-network` Docker network, allowing them to communicate using service names as hostnames.

## Volumes

Data persistence is handled via Docker volumes:
- `auth_postgres_data` - Auth database data
- `user_postgres_data` - User database data
- `prediction_postgres_data` - Prediction database data
- `neo4j_data` - Neo4j data
- `neo4j_logs` - Neo4j logs

Volumes persist data even when containers are stopped.

