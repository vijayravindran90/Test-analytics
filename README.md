# Test Analytics Dashboard

A comprehensive test reporting and analytics dashboard for Playwright tests, similar to BrowserStack. Track test duration, stability, and flakiness percentage across your test suites. **Now with built-in user authentication and multi-tenant project isolation!**

## Key Features

### 🔐 User Authentication & Multi-Tenant Support (NEW in v1.1.0)
- **User Registration & Login**: Create secure accounts with email and password
- **JWT-Based Authentication**: Secure stateless authentication with 7-day token expiry
- **Project Isolation**: Each user's projects and test data are completely isolated
- **Per-User Project Namespacing**: Same project name can exist across different user profiles

### 📊 Test Analytics
- **Test Metrics Dashboard**: Real-time metrics including pass rate, failure rate, flakiness percentage, and stability score
- **Browser-Specific Analytics**: Track test metrics across different browsers (Chromium, Firefox, WebKit) with separate dashboards and trend analysis
- **Test Run Organization**: Tests grouped by execution runs (identified by buildId or time windows) with expandable details for each run
- **Test Duration Tracking**: Monitor test execution times and identify performance regressions
- **Flaky Test Detection**: Automatically identify and categorize flaky tests with trend analysis
- **Performance Alerts**: Get notified when tests exceed performance thresholds
- **Historical Trend Analysis**: Visualize test metrics over time with interactive charts

### 🚀 Advanced Features
- **Multi-Project Support**: Manage multiple test projects within your account
- **CI/CD Integration**: Built-in support for GitHub Actions, GitLab CI, and Jenkins with Playwright reporter
- **Theme Toggle**: Switch between light and dark mode from the dashboard header
- **Quick Documentation Access**: Header `Docs` link opens architecture documentation on GitHub
- **Persistent Footer Links**: Footer includes repository shortcut and copyright attribution

## Architecture

The solution consists of 4 main packages:

```
├── packages/
│   ├── reporter/          # Playwright custom reporter
│   ├── shared/            # Shared types and utilities
│   ├── backend/           # Express.js API server
│   └── frontend/          # React dashboard UI
└── tests/                 # Example Playwright tests
```

## Tech Stack

- **Reporter**: Playwright reporter API
- **Backend**: Node.js + Express + PostgreSQL + JWT (JSON Web Tokens)
- **Frontend**: React + TypeScript + Tailwind CSS + Recharts + React Router
- **Database**: PostgreSQL with migrations support
- **Authentication**: bcryptjs (password hashing) + jsonwebtoken (JWT)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up PostgreSQL

```bash
# Create a new database
createdb test_analytics

# Or configure your DATABASE_URL in packages/backend/.env
DATABASE_URL=postgresql://username:password@localhost:5432/test_analytics
```

### 3. Run Database Migrations

```bash
cd packages/backend
npm run db:migrate
```

### 4. Configure Environment Variables

Create `.env` files in each package:

**packages/backend/.env**:
```ini
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/test_analytics
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-secret-key-min-32-chars-generated-randomly
ADMIN_KEY=optional-admin-api-key
```

> **Note on JWT_SECRET**: Generate a strong random key of at least 32 characters for production. Example: `openssl rand -base64 32`

**packages/frontend/.env** (optional):
```ini
VITE_API_URL=http://localhost:3001/api
```

### 5. Start the Backend Server

```bash
npm run dev -w packages/backend
```

The API will be available at `http://localhost:3001/api`

### 6. Start the Frontend Dashboard

```bash
npm run dev -w packages/frontend
```

The dashboard will be available at `http://localhost:3000`

## Using the Dashboard

### Important: Authentication Required

Starting with v1.1.0, the dashboard requires user authentication. All test data is private to each user's account.

### 1. Create Your Account

1. Open the dashboard at `http://localhost:3000`
2. Click **"Login"** in the top right
3. Click **"Create Account"** to register
4. Enter your email and password
5. Click **"Sign Up"**

### 2. Create a Project

1. After logging in, click **"New Project"**
2. Enter a project name (e.g., "My Test Suite")
3. Save your **Project ID** (displayed in the URL after creation)

### 3. Configure Playwright Reporter

In your `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['test-analytics-reporter', {
      backendUrl: 'http://localhost:3001/api',
      projectId: 'your-project-id',
      projectName: 'My Test Suite',
      enabled: true,
    }],
  ],
  // ... rest of config
});
```

### 4. Run Tests

```bash
npx playwright test
```

Test results will be automatically sent to your private dashboard.

## Using the Reporter

The reporter automatically captures these environment variables for CI/CD integration:

```bash
# Build information
CI_BUILD_ID=build-123
CI_COMMIT_SHA=abc123def
CI_COMMIT_BRANCH=main
CI_COMMIT_AUTHOR=john.doe

# Or GitHub Actions
GITHUB_RUN_ID=your-run-id
GITHUB_SHA=your-commit-sha
GITHUB_REF_NAME=your-branch
GITHUB_ACTOR=your-username
```

### 3. Run Your Tests

```bash
npx playwright test
```

Test results will be automatically sent to the analytics dashboard.

## API Documentation

### Authentication

All endpoints except `/auth/register` and `/auth/login` require a Bearer token in the `Authorization` header.

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3001/api/projects
```

**Authentication Endpoints:**

- `POST /api/auth/register` - Create a new user account
  - Body: `{ email, password, name? }`
  - Returns: `{ token, user: { id, email, name } }`

- `POST /api/auth/login` - Log in and get a JWT token
  - Body: `{ email, password }`
  - Returns: `{ token, user: { id, email, name } }`

- `GET /api/auth/me` - Get current user profile
  - Requires: Bearer token
  - Returns: `{ user: { id, email, name } }`

### Projects

All project endpoints require authentication.

- `GET /api/projects` - Get all projects for the authenticated user
- `POST /api/projects` - Create a new project (name must be unique per user)
- `GET /api/projects/:projectId` - Get project details
- `PUT /api/projects/:projectId` - Update project
- `DELETE /api/projects/:projectId` - Delete project

### Test Results

- `POST /api/tests/batch` - Submit batch of test results (requires projectId authorization)

### Analytics

- `GET /api/projects/:projectId/dashboard` - Get full dashboard data
- `GET /api/projects/:projectId/metrics` - Get metrics for project
- `GET /api/projects/:projectId/metrics?days=30` - Get metrics for specified days
- `GET /api/projects/:projectId/flaky-tests` - Get list of flaky tests
- `GET /api/projects/:projectId/performance-alerts` - Get performance alerts
- `GET /api/projects/:projectId/trends` - Get metrics trends over time

### Browser Analytics (NEW)

- `GET /api/projects/:projectId/browser-metrics` - Get aggregated metrics by browser
- `GET /api/projects/:projectId/browser-trends` - Get browser performance trends over time
- `GET /api/projects/:projectId/tests/browser/:browser` - Get tests filtered by browser

### Test Runs (NEW)

- `GET /api/projects/:projectId/test-runs` - Get list of test run executions
- `GET /api/projects/:projectId/test-runs/:runId/tests` - Get tests in a specific run

## Dashboard Features

### App Navigation & UI

- **Light/Dark Theme Toggle**: Use the header toggle to switch themes; preference is saved in browser storage
- **Docs Shortcut**: `Docs` in the header opens `docs/architecture.md` on GitHub in a new tab
- **Footer GitHub Link**: Click the GitHub icon in the footer to open the project repository

### Metrics Overview

View key metrics at a glance:
- **Pass Rate**: Percentage of tests that passed
- **Failure Rate**: Percentage of tests that failed
- **Flakiness**: Percentage of tests showing flaky behavior
- **Stability**: Overall test suite stability score (100 - flakiness)

### Flaky Tests

Identify problematic tests:
- Flakiness percentage
- Total runs, passed, and failed counts
- Trend analysis (improving, degrading, stable)
- Historical tracking

### Performance Alerts

Track test duration regressions:
- Current and previous duration comparison
- Percentage increase detection
- Automatic threshold-based alerts
- Alert timestamp and details

### Trend Analysis

Visualize metrics over time:
- Pass rate trend
- Test duration trends
- Flakiness changes
- Metrics overview with stacked bar charts

### Recent Tests

View recently executed tests:
- Test status and duration
- Retry information
- Branch and commit details
- Author information

## CI/CD Integration

### GitHub Actions

The project includes a sample GitHub Actions workflow (`.github/workflows/test-analytics.yml`).

To enable analytics reporting in GitHub Actions:

1. Set repository secrets:
   - `ANALYTICS_API_URL`: Your backend API URL
   - `PROJECT_ID`: Your project identifier
   - `ANALYTICS_API_KEY`: Optional API key for authentication

2. Commit the workflow file

3. Push to trigger tests and automatic result reporting

### GitLab CI

Example `.gitlab-ci.yml` configuration:

```yaml
test:
  image: mcr.microsoft.com/playwright:v1.40.0-jammy
  script:
    - npm install
    - npx playwright test
  after_script:
    - echo "Test results sent to analytics dashboard"
  env:
    ANALYTICS_API_URL: ${CI_API_URL}
    PROJECT_ID: ${CI_PROJECT_PATH}
    CI_BUILD_ID: ${CI_PIPELINE_ID}
    CI_COMMIT_SHA: ${CI_COMMIT_SHA}
    CI_COMMIT_BRANCH: ${CI_COMMIT_BRANCH}
    CI_COMMIT_AUTHOR: ${GITLAB_USER_LOGIN}
```

### Jenkins

Example Jenkins pipeline:

```groovy
pipeline {
    agent any
    
    environment {
        ANALYTICS_API_URL = credentials('analytics-api-url')
        PROJECT_ID = credentials('analytics-project-id')
        Analysis_API_KEY = credentials('analytics-api-key')
    }
    
    stages {
        stage('Test') {
            steps {
                sh '''
                    npm install
                    npx playwright test
                '''
            }
        }
    }
    
    post {
        always {
            junit 'test-results.xml'
            archiveArtifacts artifacts: 'playwright-report/**'
        }
    }
}
```

## Database Schema

### Tables

- **projects**: Stores project information
- **test_results**: Individual test execution results
- **test_suites**: Grouped test results from test runs
- **daily_metrics**: Aggregated daily metrics for trend analysis
- **flaky_tests**: Tracked flaky test metadata and statistics
- **performance_alerts**: Performance regression alerts

### Indexes

Optimized indexes on commonly queried fields:
- `project_id` (test_results, test_suites, daily_metrics, flaky_tests, performance_alerts)
- `created_at` (test_results)
- `test_id` (test_results)
- `status` (test_results)
- `date` (daily_metrics)

## Metrics Calculations

### Pass Rate
```
passRate = (passedTests / totalTests) * 100
```

### Flakiness
```
flakinessPercentage = (flakyTests / totalTests) * 100
```

### Stability
```
stability = 100 - flakinessPercentage
```

### Failure Rate
```
failureRate = (failedTests / totalTests) * 100
```

### Flaky Test Detection
A test is considered flaky if:
- It passed and failed across different runs
- It required retries to succeed
- It shows inconsistent results

## Troubleshooting

### Reporter Not Sending Data

1. Check that the backend server is running:
   ```bash
   curl http://localhost:3001/api/health
   ```

2. Verify the `backendUrl` in your Playwright config

3. Check browser console for network errors

4. Ensure the database is running and migrations are complete

### No Data Appearing in Dashboard

1. Verify test results are being sent by checking backend logs
2. Ensure the project was created in the dashboard
3. Wait a moment for data aggregation (daily metrics run on new data)
4. Check database directly:
   ```sql
   SELECT * FROM test_results LIMIT 5;
   ```

### Performance Issues

1. Ensure database indexes are present:
   ```sql
   \d test_results
   ```

2. Archive old data:
   ```sql
   DELETE FROM test_results WHERE created_at < NOW() - INTERVAL '90 days';
   ```

3. Monitor database query performance

## Development

### Build All Packages

```bash
npm run build
```

### Run Tests

```bash
npx playwright test
```

### Database Migrations

```bash
cd packages/backend
npm run db:migrate
```

## Production Deployment

### Backend Deployment

1. Build: `npm run build -w packages/backend`
2. Environment: Set production `.env` variables
3. Database: Run migrations against production database
4. Start: `npm start -w packages/backend`

### Frontend Deployment

1. Build: `npm run build -w packages/frontend`
2. Deploy dist folder to your hosting service
3. Set `REACT_APP_API_URL` to production backend URL

### Docker

Create a `Dockerfile` for containerized deployment:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY . .

RUN npm install
RUN npm run build

EXPOSE 3001

CMD ["npm", "start", "-w", "packages/backend"]
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

For issues and questions:
- GitHub Issues: [Create an issue]
- Documentation: See docs/ folder
- Examples: See tests/ folder

## Roadmap

- [ ] Webhook notifications for alerts
- [ ] Email digest reports
- [ ] Test comparison between branches
- [ ] Custom metrics and KPIs
- [ ] Multi-user authentication
- [ ] Test result exports (PDF, Excel, JSON)
- [ ] Performance profiling integration
- [ ] Mobile app for alerts
- [ ] Slack/Teams integration
- [ ] Test quality scoring

---

**Built with ❤️ for better test analytics**
