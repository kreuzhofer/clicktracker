# Build and Test Specification for Campaign Click Tracker

## Overview
This document outlines the essential tests and validation procedures for the Campaign Click Tracker development environment setup. These tests ensure that all services are properly configured and working together.

## Prerequisites
- Docker and Docker Compose installed
- Node.js 18+ (for local development testing)
- Available ports for services (adjust if conflicts exist)

## Test Procedures

### 1. Initial Setup Tests

#### 1.1 Generate Package Lock Files
```bash
# Backend dependencies
cd backend && npm install

# Frontend dependencies  
cd frontend && npm install
```

**Expected Result**: `package-lock.json` files created in both directories without errors.

#### 1.2 Docker Build Test
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml build
```

**Expected Result**: All services build successfully without errors.

### 2. Service Startup Tests

#### 2.1 Full Environment Startup
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

**Expected Result**: All containers start and reach healthy state:
- PostgreSQL: "database system is ready to accept connections"
- Redis: "Ready to accept connections tcp"
- Backend: "Server running on port 3001"
- Frontend: Vite dev server starts

#### 2.2 Individual Service Testing
If port conflicts occur, test services individually:

```bash
# Test backend services only
docker-compose up postgres redis backend
```

### 3. Backend API Tests

#### 3.1 Health Check Endpoint
```bash
curl http://localhost:[BACKEND_PORT]/health
```

**Expected Response**:
```json
{"status":"OK","timestamp":"2025-11-03T19:43:09.008Z"}
```

#### 3.2 Root Endpoint
```bash
curl http://localhost:[BACKEND_PORT]/
```

**Expected Response**:
```json
{"message":"Campaign Click Tracker API"}
```

### 4. Database Tests

#### 4.1 Database Connection Test
```bash
docker exec campaign-tracker-db psql -U postgres -c "\l"
```

**Expected Result**: Shows `campaign_tracker` database in the list.

#### 4.2 Schema Validation
```bash
docker exec campaign-tracker-db psql -U postgres -d campaign_tracker -c "\dt"
```

**Expected Result**: Shows all required tables:
- campaigns
- campaign_links  
- click_events
- conversion_events
- youtube_video_stats

#### 4.3 Database Version Check
```bash
docker exec campaign-tracker-db psql -U postgres -d campaign_tracker -c "SELECT version();"
```

**Expected Result**: PostgreSQL 15.x version information.

### 5. Redis Tests

#### 5.1 Redis Connectivity Test
```bash
docker exec campaign-tracker-redis redis-cli ping
```

**Expected Response**: `PONG`

#### 5.2 Redis Info Test
```bash
docker exec campaign-tracker-redis redis-cli info server
```

**Expected Result**: Redis server information including version 7.x.

### 6. Frontend Tests

#### 6.1 TypeScript Compilation Test
```bash
cd frontend && npm run build
```

**Expected Result**: Clean build with no TypeScript errors, generates `dist/` folder.

#### 6.2 Development Server Test
```bash
cd frontend && npm run dev
```

**Expected Result**: Vite dev server starts on port 3000.

#### 6.3 Frontend Accessibility Test
```bash
curl -s http://localhost:[FRONTEND_PORT]/ | head -10
```

**Expected Result**: HTML content with React app structure.

### 7. Integration Tests

#### 7.1 Service Communication Test
Verify backend can connect to database and Redis:
- Check backend logs for successful database connection
- Verify no connection errors in container logs

#### 7.2 Network Connectivity Test
```bash
# Test internal network connectivity
docker exec campaign-tracker-backend ping postgres
docker exec campaign-tracker-backend ping redis
```

**Expected Result**: Successful ping responses.

### 8. Port Conflict Resolution

If port conflicts occur during testing:

1. **Identify conflicting ports**: Check error messages for "port already allocated"
2. **Update port mappings**: Modify `docker-compose.yml` and `docker-compose.dev.yml`
3. **Common alternative ports**:
   - Frontend: 18000, 4000, 8080
   - Backend: 18001, 4001, 8081  
   - PostgreSQL: 5433, 15432
   - Redis: 6380, 16379

### 9. Cleanup Tests

#### 9.1 Graceful Shutdown Test
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
```

**Expected Result**: All containers stop cleanly, networks and volumes preserved.

#### 9.2 Complete Cleanup Test
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down -v
```

**Expected Result**: All containers, networks, and volumes removed.

## Common Issues and Solutions

### Issue: Port Conflicts
**Symptoms**: "port already allocated" errors
**Solution**: Update port mappings in docker-compose files

### Issue: TypeScript Errors in Frontend
**Symptoms**: Build fails with TS errors
**Solution**: Remove unused React imports (not needed in React 18)

### Issue: Database Connection Failures
**Symptoms**: Backend can't connect to PostgreSQL
**Solution**: Verify database service is healthy before backend starts

### Issue: Missing Package Lock Files
**Symptoms**: Docker build fails with npm ci errors
**Solution**: Run `npm install` locally first to generate lock files

## Test Checklist

- [ ] Package lock files generated
- [ ] Docker images build successfully
- [ ] All containers start without errors
- [ ] PostgreSQL database accessible with correct schema
- [ ] Redis responds to ping
- [ ] Backend API endpoints respond correctly
- [ ] Frontend builds and serves content
- [ ] Services can communicate internally
- [ ] Environment variables load correctly
- [ ] Graceful shutdown works

## Performance Benchmarks

### Build Times (Approximate)
- Backend Docker build: 8-10 seconds
- Frontend Docker build: 25-30 seconds
- Full environment startup: 30-45 seconds

### Resource Usage
- Total memory usage: ~500MB
- CPU usage during startup: High initially, then low
- Disk space: ~2GB for images and volumes

## Notes

- Always test with fresh containers when validating changes
- Port conflicts are common in development environments
- Database initialization only runs on first startup
- Frontend hot reload requires development override configuration
- Environment variables should be validated before container startup