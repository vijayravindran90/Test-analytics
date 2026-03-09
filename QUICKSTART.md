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

Edit `packages/backend/.env` - make sure `JWT_SECRET` is set. Generate a new one:

```bash
# Generate a secure JWT_SECRET (only needs to be done once)
openssl rand -base64 32
# Copy the output to JWT_SECRET in .env
```
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


## Create Your Account & Project

### Step 1: Create Account

1. Click **"Login"** link in the top right
2. Click **"Create Account"** to switch to registration mode
3. Enter your email and password (at least 6 characters)
4. Click **"Sign Up"**
5. You'll be logged in automatically and redirected to your projects page

### Step 2: Create Your First Project
- Use the header toggle to switch between light and dark mode
- Click `Docs` in the header to open the architecture documentation on GitHub
- Use the GitHub icon in the footer to open the repository

## Create Your First Project

1. Click "New Project" button
2. Enter project name (e.g., "My Test Suite")
### 1. Get Your Project ID

From the dashboard, click on your project to see its ID in the URL bar.

### 2. Update Playwright Config
4. Note your **Project ID** (displayed in the URL: `/project/{projectId}`)

## Run Tests with Analytics

import { defineConfig } from '@playwright/test';

export default defineConfig({
### 1. Update Playwright Config

In your `playwright.config.ts`:

```typescript
reporter: [
  ['test-analytics-reporter', {
  // ... rest of config
});
    backendUrl: 'http://localhost:3001/api',
    projectId: 'your-project-id-from-step-2',
### 3. Run Tests
  }],
],
```

### 2. Run Tests
### 4. View Results
```bash
npx playwright test
```
## Dashboard Features

From the dashboard UI:
- Use the header toggle to switch between light and dark mode
- Click `Docs` in the header to open the architecture documentation
- Click the GitHub icon in the footer to open the repository
- Click your email in the header to see your user profile
- Click "Logout" to sign out


### 3. View Results


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

- Check [docs/architecture.md](../docs/architecture.md) to understand the system architecture
- Check [CI/CD Integration](../docs/ci-cd-integration.md) for GitHub Actions, GitLab, Jenkins setup

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
**JWT_SECRET not set?**
```bash
# Generate and set in packages/backend/.env
openssl rand -base64 32
```

**Authentication failed?**
```bash
# Check that backend is running on http://localhost:3001
# Verify email/password are correct
# Try creating a new account
```

```bash
# Check PostgreSQL is running
# Verify DATABASE_URL in packages/backend/.env
# Verify projectId matches your dashboard project
# Check browser console for network errors
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
