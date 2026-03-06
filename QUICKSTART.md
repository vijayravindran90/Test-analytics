# Quick Start Guide

Get the Test Analytics Dashboard up and running in 5 minutes.

## Prerequisites

- Node.js 18+ ([Download](https://nodejs.org/))
- PostgreSQL 12+ ([Download](https://www.postgresql.org/download/))
- Git

## Installation Steps

### 1. Clone and Install

```bash
# Clone or extract the project
cd playwright-test-analytics

# Install all dependencies
npm install
```

### 2. Setup Database

```bash
# Create database (macOS/Linux)
createdb test_analytics

# Or on Windows with PostgreSQL installed:
# psql -U postgres -c "CREATE DATABASE test_analytics;"

# Run migrations
cd packages/backend
npm run db:migrate
cd ../..
```

### 3. Configure Environment

Copy the example env files:

```bash
cp packages/backend/.env.example packages/backend/.env
```

Edit `packages/backend/.env` if needed (defaults should work for local development)

### 4. Start Services

Open two terminal windows:

**Terminal 1 - Backend API:**
```bash
npm run dev -w packages/backend
# Should show: ✓ Analytics API server running on http://localhost:3001
```

**Terminal 2 - Frontend Dashboard:**
```bash
npm run dev -w packages/frontend
# Should show: Local: http://localhost:3000
```

### 5. Access Dashboard

Open your browser and navigate to: **http://localhost:3000**

## Create Your First Project

1. Click "New Project" button
2. Enter project name (e.g., "My Test Suite")
3. Click "Create Project"
4. Note your **Project ID** (displayed in the URL: `/project/{projectId}`)

## Run Tests with Analytics

### 1. Update Playwright Config

In your `playwright.config.ts`:

```typescript
reporter: [
  ['test-analytics-reporter', {
    backendUrl: 'http://localhost:3001/api',
    projectId: 'your-project-id-from-step-2',
    projectName: 'My Test Suite',
  }],
],
```

### 2. Run Tests

```bash
npx playwright test
```

### 3. View Results

Results will automatically appear in your dashboard at http://localhost:3000

## What You'll See

✅ **Key Metrics**
- Pass Rate, Failure Rate, Flakiness, Stability

✅ **Test Counts**
- Total Tests, Passed, Failed, Skipped

✅ **Duration Metrics**
- Average and Total Test Duration

✅ **Charts & Trends**
- Pass rate trends, Duration trends, Metrics overview

✅ **Flaky Tests**
- Tests with inconsistent results and their improvement/degradation trend

✅ **Performance Alerts**
- Tests that exceed performance thresholds

✅ **Recent Tests**
- Latest test executions with status and details

## Next Steps

- Read [README.md](../README.md) for detailed documentation
- Check [CI/CD Integration](../docs/ci-cd-integration.md) for GitHub Actions, GitLab, Jenkins setup
- Review example tests in `tests/example.spec.ts`
- Customize metrics and thresholds for your needs

## Troubleshooting

**Port already in use?**
```bash
# Change port in packages/frontend/vite.config.ts or packages/backend/.env
```

**Database connection error?**
```bash
# Check PostgreSQL is running
# Verify DATABASE_URL in packages/backend/.env
```

**Tests not sending data?**
```bash
# Verify backendUrl in playwright.config.ts starts with your backend API URL
# Check browser console for network errors
```

## Stopping Services

Press `Ctrl+C` in each terminal to stop the services.

---

**Ready to track your test analytics!** 🚀
