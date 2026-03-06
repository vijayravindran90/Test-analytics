# Setup Verification & Quick Reference

Quick reference guide and troubleshooting for the Test Analytics Dashboard.

## Pre-Flight Checklist

### Required Software

- [ ] Node.js 18+ installed: `node -v`
- [ ] npm installed: `npm -v`
- [ ] PostgreSQL 12+ installed: `psql --version`
- [ ] Git installed: `git --version`

### Quick Installation Check

```bash
# Test Node.js installation
node --version  # Should be v18.0.0 or higher
npm --version   # Should be 9.0.0 or higher

# Test PostgreSQL installation
psql --version  # Should be 12 or higher

# Verify PostgreSQL service is running
psql -U postgres -c "SELECT 1;"
```

## Project Structure

```
playwright-test-analytics/
├── packages/
│   ├── reporter/          # Playwright reporter
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── shared/            # Shared types
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── backend/           # Express API
│   │   ├── src/
│   │   ├── scripts/
│   │   ├── .env.example
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── frontend/          # React dashboard
│       ├── src/
│       ├── index.html
│       ├── package.json
│       ├── tailwind.config.js
│       └── vite.config.ts
├── tests/                 # Example tests
│   └── example.spec.ts
├── docs/                  # Documentation
├── .github/workflows/     # CI/CD workflows
├── docker-compose.yml     # DB setup
├── playwright.config.ts   # Playwright config
├── README.md
├── QUICKSTART.md
└── package.json
```

## Quick Commands

### Initial Setup

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL (with Docker)
docker-compose up -d

# 3. Run migrations
cd packages/backend && npm run db:migrate

# 4. Start backend
npm run dev -w packages/backend

# 5. In another terminal, start frontend
npm run dev -w packages/frontend

# 6. Access dashboard
# Open http://localhost:3000 in your browser
```

### Development

```bash
# Watch mode for backend
npm run dev -w packages/backend

# Watch mode for frontend
npm run dev -w packages/frontend

# Run tests
npx playwright test

# Run tests with UI
npx playwright test --ui

# Debug tests
npx playwright test --debug
```

### Database

```bash
# Access PostgreSQL
psql -U postgres -d test_analytics

# Run migrations
npm run db:migrate -w packages/backend

# Reset database (WARNING: deletes all data)
dropdb test_analytics
createdb test_analytics
npm run db:migrate -w packages/backend

# View data with pgAdmin
# Open http://localhost:5050 (user: admin@example.com, pass: admin)
```

### Building

```bash
# Build specific package
npm run build -w packages/backend
npm run build -w packages/frontend

# Build all
npm run build

# Start production backend
npm start -w packages/backend
```

## Environment Variables

### Backend (.env)

```ini
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/test_analytics
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
API_KEY=optional-secret-key
```

### Playwright Config

```typescript
reporter: [
  ['test-analytics-reporter', {
    backendUrl: 'http://localhost:3001/api',
    projectId: 'my-project-id',
    projectName: 'My Project',
    apiKey: process.env.API_KEY,  // Optional
    enabled: true,
  }],
],
```

### CI/CD (GitHub Actions)

```yaml
env:
  ANALYTICS_API_URL: ${{ secrets.ANALYTICS_API_URL }}
  PROJECT_ID: ${{ secrets.PROJECT_ID }}
  API_KEY: ${{ secrets.ANALYTICS_API_KEY }}
```

## Common Tasks

### Create a New Project

```bash
# Via Dashboard
1. Click "New Project" on frontend
2. Enter project name
3. Click "Create Project"
4. Copy project ID from URL

# Via API
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"My Project","description":"Test suite"}'
```

### Submit Test Results

```bash
# Automatically via Playwright reporter
npx playwright test

# Via API
curl -X POST http://localhost:3001/api/tests/batch \
  -H "Content-Type: application/json" \
  -d '{
    "results":[...],
    "projectId":"proj-id",
    "projectName":"My Project"
  }'
```

### View Dashboard Metrics

```bash
# Via Browser
http://localhost:3000/project/{projectId}

# Via API
curl http://localhost:3001/api/projects/{projectId}/dashboard?days=30
```

### Export Test Data

```bash
# Get all test results (JSON)
curl http://localhost:3001/api/projects/{projectId}/recent-tests?limit=1000

# Get metrics (JSON)
curl http://localhost:3001/api/projects/{projectId}/metrics

# Export via database
psql -U postgres -d test_analytics -c \
  "COPY test_results TO STDOUT CSV;" > results.csv
```

## Troubleshooting

### "Cannot find module 'test-analytics-shared'"

```bash
# Ensure all packages are installed
npm install
npm install -w packages/shared
npm install -w packages/reporter
npm install -w packages/backend
npm install -w packages/frontend
```

### "Port 3001 is already in use"

```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or change port in .env
PORT=3002
```

### "Listen EADDRINUSE: address already in use"

```bash
# Check what's using the port
netstat -an | grep 3001

# Kill the process
kill -9 <PID>
```

### "PostgreSQL connection refused"

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start if not running
sudo systemctl start postgresql

# Or with Docker
docker-compose up -d postgres
```

### "Migrations failed"

```bash
# Check migrations are in correct folder
ls packages/backend/src/migrations/

# Run migrations manually
npm run db:migrate -w packages/backend

# Check database
psql -U postgres -d test_analytics -c "\dt"
```

### "No data in dashboard"

```bash
# Check test results in database
psql -U postgres -d test_analytics \
  -c "SELECT COUNT(*) FROM test_results;"

# Verify reporter is sending data (check browser DevTools)
# Check backend logs for POST /api/tests/batch

# Test API endpoint
curl http://localhost:3001/api/projects/{projectId}/metrics
```

### "CORS error"

```bash
# Check frontend URL matches FRONTEND_URL in backend .env
# Update both if needed:

# Frontend: packages/frontend/vite.config.ts proxy
# Backend: packages/backend/.env FRONTEND_URL
```

## Performance Optimization

### Check Query Performance

```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();

-- Check slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC;
```

### Add Missing Indexes

```sql
-- Check existing indexes
SELECT * FROM pg_indexes WHERE tablename = 'test_results';

-- Add index if missing
CREATE INDEX CONCURRENTLY idx_test_results_project_id 
ON test_results(project_id);
```

### Analyze Large Tables

```sql
ANALYZE test_results;
ANALYZE daily_metrics;
VACUUM test_results;
```

## Database Backup & Recovery

### Backup Database

```bash
# Full backup
pg_dump -U postgres test_analytics > backup.sql

# Compressed backup
pg_dump -U postgres test_analytics | gzip > backup.sql.gz

# Scheduled backup (cron)
0 2 * * * pg_dump -U postgres test_analytics | gzip > /backups/$(date +%Y%m%d).sql.gz
```

### Restore Database

```bash
# From SQL file
psql -U postgres test_analytics < backup.sql

# From compressed file
gunzip -c backup.sql.gz | psql -U postgres test_analytics
```

## Component Versions

| Component | Version | Notes |
|-----------|---------|-------|
| Node.js | 18+ | LTS recommended |
| PostgreSQL | 12+ | 15+ recommended |
| React | 18.2 | Latest stable |
| Playwright | 1.40+ | Latest |
| TypeScript | 5.3+ | Strict mode |
| Express | 4.18+ | Latest |
| Tailwind CSS | 3.3+ | Latest |

## Health Checks

### API Health

```bash
curl http://localhost:3001/api/health
# Should return: {"status":"ok","timestamp":"..."}
```

### Database Health

```bash
psql -U postgres -d test_analytics -c "SELECT 1;"
# Should return: 1 row
```

### Frontend Health

```bash
# Check in browser DevTools
# Network tab should show successful API calls
```

## Getting Help

### Check Logs

```bash
# Backend logs (terminal)
npm run dev -w packages/backend

# Frontend logs (browser DevTools)
F12 → Console

# Database logs
SELECT * FROM pg_stat_statements;
```

### Enable Debug Mode

```bash
# Backend debug logging
DEBUG=* npm run dev -w packages/backend

# Frontend debug logging
localStorage.setItem('debug', 'app:*');
```

### GitHub Issues

- Check [README.md](../README.md) for documentation
- Search existing issues
- Create new issue with logs and steps to reproduce

## System Resources

### Minimum Requirements

- **CPU**: 2 cores
- **Memory**: 4GB RAM
- **Disk**: 10GB (varies with test history)
- **Database**: 500MB - 10GB depending on test volume

### Recommended for Production

- **CPU**: 4+ cores
- **Memory**: 8GB+ RAM
- **Disk**: 50GB+
- **Database**: 50GB+ with auto-archiving

## Quick Links

- **Dashboard**: http://localhost:3000
- **API Health**: http://localhost:3001/api/health
- **PgAdmin**: http://localhost:5050
- **Playwright Docs**: https://playwright.dev
- **Recharts Docs**: https://recharts.org
- **Tailwind CSS**: https://tailwindcss.com

---

**Setup Verified On:** Ubuntu 24.04, macOS Sonoma, Windows 11  
**Last Updated:** 2024-01-01
