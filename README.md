# Test Analytics Dashboard

A comprehensive test reporting and analytics dashboard for Playwright tests, similar to BrowserStack. Track test duration, stability, and flakiness percentage across your test suites. **Now with built-in user authentication and multi-tenant project isolation!**

## Key Features

### 🔐 User Authentication & Multi-Tenant Support (NEW in v1.1.0)
- **Sign in with Google or email/password**: Both are shown on `/login` — "Continue with Google" plus a standard email/password sign in and registration form.
- **Email verification required**: Whichever method is used, an account must have a verified email before it can create projects or view dashboards. Google accounts are verified automatically (Google itself asserts `email_verified`); email/password accounts get a verification link sent to their inbox and are gated until they click it.
- **Pricing-first signup**: `/login` requires a `?plan=` value; visiting it directly (or via the header's "Get Started" button) redirects to `/pricing` first, so signing in always starts from plan selection.
- **JWT-Based Authentication**: Secure stateless authentication with 7-day token expiry
- **Project Isolation**: Each user's projects and test data are completely isolated
- **Per-User Project Namespacing**: Same project name can exist across different user profiles

> **Deployment note**: Google sign-in requires `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID` to be configured (see below) to show up as an option — email/password works without any extra setup. Without SMTP credentials configured, verification emails are logged to the backend console instead of actually sent (see below) — fine for local testing, not for real users.

### 💳 Public Landing Page, Pricing & Free Trial
- **Marketing Home Page**: Public landing page with product overview and feature highlights for visitors who aren't signed in
- **Pricing Plans**: Free (14-day trial) / Pro ($12/mo billed monthly, $10/mo billed annually) tiers with per-plan project limits, shown on `/pricing` and reused on the in-app billing page. Team is shown with a "Coming soon" badge and isn't purchasable yet.
- **14-Day Free Trial**: The Free plan is time-limited (`FREE_TRIAL_DAYS` in `packages/shared/src/plans.ts`). A banner shows days remaining; once it expires, project dashboards and project creation are blocked (HTTP 402) until the user upgrades. A canceled/lapsed paid subscription reverts to the Free plan and is subject to the same trial gate.
- **Stripe Billing**: Checkout, customer portal and subscription webhooks for upgrading/downgrading plans (optional, see setup below)

### 🧠 Advanced Analytics (NEW)
- **Confidence Score**: A single 0-100 score per project, weighted from pass rate (50%), stability (30%) and how recently tests ran (20%)
- **Guardrails**: Configurable quality gates (minimum pass rate, maximum flakiness, optional max average duration) shown as pass/fail chips on the dashboard
- **Module Heatmap**: Pass rate by test folder x day, derived automatically from each test's file path — no reporter changes needed
- **Test Folder Metrics**: Pass rate, flakiness and average duration rolled up per test folder/module

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
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

### Optional: Set Up Google Sign-In

1. Create an OAuth Client ID (type "Web application") at [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Add your frontend origin(s) (e.g. `http://localhost:3000`, `https://www.your-domain.com`) to **Authorized JavaScript origins**.
3. Set the same client ID in both places:
   - `packages/backend/.env` → `GOOGLE_CLIENT_ID`
   - `packages/frontend/.env` → `VITE_GOOGLE_CLIENT_ID`
4. Restart both servers. A "Continue with Google" button will appear on the login page automatically; it stays hidden until the client ID is configured.

Google users are matched to an existing account by email if one already exists, otherwise a new account is created automatically. Signing in with Google always marks the account's email as verified, since Google has already confirmed it.

### Optional: Set Up Email Verification (SMTP)

Every account — Google or email/password — must have a verified email before it can create projects or view dashboards. Google accounts are verified automatically; email/password accounts need an actual email sent.

1. Get SMTP credentials from any provider (e.g. SendGrid, Postmark, Amazon SES, or even a Gmail app password for testing).
2. Add to `packages/backend/.env`:
   ```ini
   SMTP_HOST=smtp.your-provider.com
   SMTP_PORT=587
   SMTP_USER=your-smtp-username
   SMTP_PASS=your-smtp-password
   EMAIL_FROM=Test Analytics <no-reply@your-domain.com>
   ```
3. Restart the backend. New registrations will now receive a real verification email instead of having the link logged to the server console.

Without SMTP configured, verification links are printed to the backend's console log (`[email] SMTP not configured — verification link for ...`) so you can still test the flow locally by copying the link from the logs.

### Optional: Create a Test Account

For exploring the app (or letting someone else try it) without going through Google/SMTP/Stripe setup, seed a permanent test account: pre-verified, on the Pro plan, never trial-limited.

**From a browser**, once deployed: set `ADMIN_KEY` in the backend's environment, then visit
```
https://<your-backend-url>/api/admin/seed-test-account?adminKey=<your-admin-key>
```
The JSON response includes the email and password — save them immediately, the password isn't shown again (only a bcrypt hash is stored). Add `&email=...` / `&password=...` to pick your own, or `&resetPassword=<new-password>` on a later visit to change the password of an account that already exists. This endpoint requires `ADMIN_KEY` to be set; without it, it refuses to run. Since the key and password travel in the URL, don't share that link with anyone you don't want to have admin/test access, and treat your browser history accordingly.

**From the command line**, equivalently:
```bash
cd packages/backend
npm run seed:test-account            # local dev, ts-node
# or, against a deployed database (e.g. `railway run` so it uses Railway's own network):
DATABASE_URL=<connection-string> npm run seed:test-account:prod   # after `npm run build`
```
Defaults to `tester@test-analytics.in` with a random password; override with `TEST_ACCOUNT_EMAIL` / `TEST_ACCOUNT_PASSWORD` / `TEST_ACCOUNT_RESET_PASSWORD` env vars. Both entry points call the same idempotent logic — re-running either just refreshes the plan/verification bypass without touching an existing password.

### Optional: Seed Demo Data

For marketing screenshots or exploring a dashboard that already has meaningful history, seed a demo project (`ShopWave E2E Suite` by default) with ~3 weeks of realistic multi-module, multi-browser test results — a deliberately flaky module, a recent performance regression, and enough spread to populate every dashboard feature: confidence score, guardrails, flaky tests, performance alerts, module heatmap, trend charts, and test runs.

**From a browser**, once deployed:
```
https://<your-backend-url>/api/admin/seed-demo-data?adminKey=<your-admin-key>
```
Defaults to seeding under the test account (`tester@test-analytics.in`); add `&email=...` to target a different account, or `&projectName=...` to use a different project name. Re-running is safe — it wipes and re-generates that account's project of the same name rather than duplicating it.

**From the command line**, equivalently:
```bash
cd packages/backend
npm run seed:demo-data            # local dev, ts-node - also creates the test account if it doesn't exist yet
# or, against a deployed database:
DATABASE_URL=<connection-string> npm run seed:demo-data:prod   # after `npm run build`
```

### Optional: Set Up Stripe Billing

1. Create a [Stripe](https://dashboard.stripe.com) account and, on the Pro product, create **two** recurring Prices matching `packages/shared/src/plans.ts`: $12/month billed monthly, and $10/month ($120/year) billed annually. Team is marked "Coming soon" in the UI and isn't purchasable yet, so its Prices aren't required until it launches.
2. Add to `packages/backend/.env`:
   ```ini
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PRICE_ID_PRO_MONTHLY=price_...
   STRIPE_PRICE_ID_PRO_ANNUAL=price_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
3. Point a Stripe webhook at `POST {your-backend-url}/api/billing/webhook`, subscribed to `checkout.session.completed`, `customer.subscription.updated` and `customer.subscription.deleted`. Use the Stripe CLI (`stripe listen --forward-to localhost:3001/api/billing/webhook`) for local testing.
4. Once configured, the pricing page and the in-app **Billing** page (from the profile menu) let users toggle monthly/annual billing and start a Stripe Checkout session, then manage their subscription through the Stripe customer portal. Without these variables set, the pricing page still renders but checkout returns a friendly "billing is not configured" error.

Plan limits (e.g. max projects per plan) are enforced in the backend when a plan's project cap is defined; retention-day limits shown on the pricing page are informational only and are not yet automatically enforced.

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
2. Click **"Get Started"** in the top right — this takes you to `/pricing` first
3. Choose a plan (Free starts a 14-day trial; Pro/Team go to Stripe Checkout after sign-in)
4. Sign in either with **"Continue with Google"**, or register with your email and password
5. If you registered with email/password, check your inbox for a verification link — you won't be able to create projects or view dashboards until you click it (Google sign-in skips this step, since Google already verified your email)

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

- `POST /api/auth/google` - Sign in (or register) with a Google ID token
  - Body: `{ idToken }` (from Google Identity Services on the frontend)
  - Returns: `{ token, user: { id, email, name } }` — `emailVerified` is always `true` for Google accounts

- `POST /api/auth/verify-email` - Verify an email/password account using the token from its verification email
  - Body: `{ token }`
  - Returns: `{ token, user }` (logs the user in immediately on success)

- `POST /api/auth/resend-verification` - Resend the verification email for the current account
  - Requires: Bearer token
  - Rate-limited to one send per minute; returns `429` if called again too soon

### Billing

- `GET /api/billing/plans` - Public pricing plan catalog (no auth required)
- `GET /api/billing/subscription` - Current user's plan, subscription status, and trial info (`trialDaysLeft`, `accessAllowed`) (requires auth)
- `POST /api/billing/checkout` - Create a Stripe Checkout session for a paid plan
  - Body: `{ planId }` (`pro` or `team`)
  - Returns: `{ url }` to redirect the browser to
- `POST /api/billing/portal` - Create a Stripe customer portal session for the current user
  - Returns: `{ url }` to redirect the browser to
- `POST /api/billing/webhook` - Stripe webhook receiver (called by Stripe, not the frontend)

### Admin

Both require `?adminKey=` (GET) or `{ adminKey }` (POST) matching the server's `ADMIN_KEY` env var.

- `GET/POST /api/admin/seed-test-account` - Create or refresh the permanent test account (see "Optional: Create a Test Account" above)
  - Query/body: `email?`, `password?`, `resetPassword?`
  - Returns: `{ success, created, email, password, plan, note }`
- `GET/POST /api/admin/seed-demo-data` - Seed (or re-seed) a realistic demo project with ~3 weeks of history (see "Optional: Seed Demo Data" above)
  - Query/body: `email?` (defaults to the test account), `projectName?`
  - Returns: `{ success, email, projectId, projectName, testResultCount }`
- `POST /api/admin/migrate` - One-off schema patch predating the migrations system; prefer `npm run db:migrate` instead

All project-data endpoints (dashboard, metrics, module heatmap, etc.), `POST /api/projects`, and `POST /api/tests/batch` (the Playwright reporter's ingestion endpoint, whenever it's called with a Bearer token or API key identifying a user) are gated by the same access check:
- `403 { error, code: 'EMAIL_NOT_VERIFIED' }` if the account's email isn't verified yet (checked before the trial, regardless of plan)
- `402 { error, code: 'TRIAL_EXPIRED' }` once a Free-plan user's trial has ended

Unauthenticated/anonymous `POST /api/tests/batch` submissions (no token at all) are intentionally left ungated, unchanged from before. The frontend's axios client redirects to `/billing` automatically on a 402; a 403 with that code surfaces the persistent "verify your email" banner instead.

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

### Advanced Analytics (NEW)

- `GET /api/projects/:projectId/confidence-score` - Weighted 0-100 confidence score with a pass-rate/stability/recency breakdown
- `GET /api/projects/:projectId/guardrails` - Pass/fail status against each project's quality gate thresholds
- `GET /api/projects/:projectId/module-metrics` - Pass rate, flakiness and duration grouped by test folder
- `GET /api/projects/:projectId/heatmap` - Module x day pass-rate matrix for the heatmap widget

Guardrail thresholds (`guardrailMinPassRate`, `guardrailMaxFlakiness`, `guardrailMaxAvgDurationMs`) can be changed via `PUT /api/projects/:projectId`, the same endpoint used for other project settings.

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
- Optional Slack webhook notifications for performance alerts

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

### Slack Alerts

If you want alert delivery in Slack, configure a Slack incoming webhook in the dashboard project settings. Once set, performance regressions will post to your Slack channel with test name, duration, threshold, and percentage increase.

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
- [x] Test result exports (PDF, Excel, JSON)
- [ ] Performance profiling integration
- [ ] Mobile app for alerts
- [x] Slack/Teams integration
- [ ] Test quality scoring

---

**Built with ❤️ for better test analytics**
