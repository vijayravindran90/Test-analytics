# Architecture & Design

This document explains the architecture and design decisions of the Test Analytics Dashboard.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Browser / Dashboard                          │
│                    (React Frontend - Port 3000)                  │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP/REST
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Express API Server                             │
│                   (Port 3001) - /api routes                       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Core API Routes                             │   │
│  │  - POST /tests/batch                                     │   │
│  │  - GET /projects/:id/dashboard                           │   │
│  │  - GET /projects/:id/metrics                             │   │
│  │  - GET /projects/:id/flaky-tests                         │   │
│  │  - GET /projects/:id/performance-alerts                  │   │
│  │  - GET /projects/:id/trends                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │          Browser & Test Run Routes (New)                 │   │
│  │  - GET /projects/:id/browser-metrics                     │   │
│  │  - GET /projects/:id/browser-trends                      │   │
│  │  - GET /projects/:id/tests/browser/:browser              │   │
│  │  - GET /projects/:id/test-runs                           │   │
│  │  - GET /projects/:id/test-runs/:runId/tests              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                               │                                   │
│  ┌──────────────────────────▼─────────────────────────────────┐  │
│  │              Service Layer                                 │  │
│  │  - TestService (metrics, aggregation, browser, runs)     │  │
│  │  - ProjectService (CRUD)                                  │  │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │ SQL
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                            │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ test_results (with browser, os, environment fields)     │    │
│  │ test_suites                                             │    │
│  │ daily_metrics                                           │    │
│  │ flaky_tests                                             │    │
│  │ performance_alerts                                      │    │
│  │ projects                                                │    │
│  │ browser_metrics (new - aggregated by browser)           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  Indexes:                                                         │
│  - idx_test_results_browser (for browser filtering)              │
│  - idx_test_results_browser_status (for aggregations)            │
│  - idx_test_results_project_browser (for dashboards)             │
│  - idx_browser_metrics_project_date (for trends)                 │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                  Playwright Tests                                 │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  test-analytics-reporter                                │    │
│  │  (Custom Playwright Reporter)                            │    │
│  │  - Captures browser name from project config             │    │
│  │  - Detects OS from browser type                          │    │
│  │  - Groups tests by buildId or time windows               │    │
│  └──────────────────────────────────────────────────────────┘    │
│                               │ Batches test results                   │
│                               ▼                                   │
│                    Sends to API /tests/batch                     │
└──────────────────────────────────────────────────────────────────┘
```

## Component Structure

### Shared Package (`test-analytics-shared`)

TypeScript type definitions used across the entire project:
- `TestResult` - Individual test execution data
- `TestMetrics` - Aggregated test metrics
- `FlakyTest` - Flaky test tracking
- `PerformanceAlert` - Performance regression alerts
- `DashboardData` - Complete dashboard payload

**Why shared types?**
- Single source of truth for data structures
- Type safety across frontend and backend
- Reduces bugs from type mismatches
- Easier API contract documentation

### Reporter Package (`test-analytics-reporter`)

Custom Playwright reporter that:
1. Hooks into test lifecycle (`onBegin`, `onTestBegin`, `onTestEnd`, `onEnd`)
2. **Captures browser name from Playwright's private _project property** (NEW)
3. **Infers OS type from browser name** (NEW)
4. Collects test execution metrics
5. Groups tests by execution run
6. Batch sends results to backend API
7. Extracts CI/CD environment variables

**Key features:**
- Browser detection: chromium, firefox, webkit
- Automatic retry detection
- Flaky test identification
- Configurable batch size (default: 50)
- Non-blocking error handling
- Environment variable extraction for CI/CD context

**Why separate package?**
- Can be published independently to npm as `@reporter/test-analytics-reporter`
- Reusable across multiple projects
- Clear separation of concerns
- Easy versioning and updates

### Backend Package (`@test-analytics/backend`)

Express.js REST API with layered architecture:

```
Request → Route Handler → Service → Database
           ↓
        Validation
        Error Handling
        Response Formatting
```

**Layers:**

1. **Routes** (`/routes`)
   - HTTP endpoint definitions
      ┌──────────────────────────────────────────────────────────────────┐
      │                   Authentication Layer                            │
      │                                                                   │
      │  ┌──────────────────────────────────────────────────────────┐   │
      │  │        JWT Token Management (Bearer Scheme)              │   │
      │  │  - POST /auth/register (create account)                  │   │
      │  │  - POST /auth/login (get JWT token)                      │   │
      │  │  - GET /auth/me (validate token & get user)              │   │
      │  │  - Token Expiry: 7 days                                  │   │
      │  │  - Password Hashing: bcryptjs (10 rounds)                │   │
      │  └──────────────────────────────────────────────────────────┘   │
      │                               │                                   │
      └───────────────────────────────┼───────────────────────────────────┘
   - Input validation
   - Response formatting

2. **Services** (`/services`)
   - Business logic
   - Data aggregation
   - Metric calculations
   - Database queries

3. **Database** (`/db`)
   - PostgreSQL connection pool
   - Connection management
   - Error handling

**Why layered architecture?**
- Clear separation of concerns
- Easy testing of business logic
- Reusable services
- Scalable and maintainable

### Frontend Package (`@test-analytics/frontend`)

React dashboard with hooks for data fetching:
      ┌──────────────────────────────────────────────────────────────────┐
      │              Service Layer with Multi-Tenant Awareness            │
      │  - UserService (register, login, profile)                        │
      │  - ProjectService (CRUD with user_id filtering)                  │
      │  - TestService (aggregation with project ownership check)        │
      │  └──────────────────────────────────────────────────────────────┘

```
App (Router)
├── Pages
│   ├── Projects (list all)
│   └── ProjectDetail (comprehensive dashboard)
├── Components
│   ├── MetricCard (basic metrics display)
│   ├── FlakyTestsList (flaky test analysis)
│   ├── PerformanceAlerts (performance regression alerts)
│   ├── BrowserMetrics (new - browser-specific charts & tables)
│   ├── TestRunsList (new - collapsible test run organization)
│   └── Charts (TrendChart, DurationChart, MetricsOverviewChart)
└── API
    ├── client.ts (axios instance)
    └── hooks.ts (custom data-fetching hooks)
```

**New Features:**
- **Browser Analytics**: `BrowserMetricsChart`, `BrowserMetricsTable` components with separate metrics per browser
- **Test Run Organization**: `TestRunsList` component with expandable runs showing test details on click
- **New Hooks**: `useBrowserMetrics`, `useBrowserTrends`, `useTestRuns`, `useTestRunDetails`

**Architecture decisions:**

1. **React Router** - Client-side navigation
2. **Custom Hooks** - Data fetching abstraction
3. **Tailwind CSS** - Styling without CSS bloat
4. **Recharts** - Chart visualization

## Data Flow

### Test Execution to Dashboard

1. **Test Runs**
   ```
   Playwright executes tests (with browser config)
   ↓
   Reporter captures results and browser name
   ↓
   Groups tests by run (buildId or time window)
      │  ┌─────────────────────────────────────────────────────────┐    │
      │  │ users (NEW v1.1.0)                                      │    │
      │  │   - id (UUID)                                           │    │
      │  │   - email (UNIQUE)                                      │    │
      │  │   - password_hash (bcrypt)                              │    │
      │  │   - name                                                │    │
      │  │   - created_at, updated_at                              │    │
      │  └─────────────────────────────────────────────────────────┘    │
      │
   ↓
   Batches 50 results
      │  │   - id (UUID)                                           │    │
      │  │   - user_id (FK to users.id) [NEW]                      │    │
   ↓
   POST /api/tests/batch
   ```

2. **Backend Processing**
   ```
   Receives batch of test results with browser info
   ↓
   Validates input and extracts browser name
   ↓
   Stores in test_results table
   ↓
   Aggregates browser-specific metrics
   ↓
   Updates flaky_tests table
   ↓
      │  - idx_projects_user_id (for filtering user projects)            │
      │  - idx_projects_user_id_name_unique (per-user uniqueness)        │
   Updates daily_metrics table
   ↓
   Updates browser_metrics table (new)
   ↓
   Checks performance alerts
   ↓
   Returns success response
   ```

3. **Browser Metrics Aggregation**
   ```
   SELECT COUNT(*), SUM(CASE WHEN status='PASSED')
   FROM test_results
   WHERE project_id = $1 AND browser = $2
   GROUP BY browser
   ↓
   Calculate pass_rate, avg_duration by browser
   ↓
   Store in browser_metrics table
   ↓
   Build trend data for charts
   ```

4. **Test Run Grouping**
   ```
   SELECT * FROM test_results
   GROUP BY COALESCE(build_id, DATE_TRUNC('minute', created_at))
   ↓
   Aggregate run statistics (pass_rate, counts, duration)
   ↓
   Return run summaries via /test-runs endpoint
   ↓
   On expansion, fetch full test details for that run
   ```

5. **Dashboard Display**
   ```
   Frontend requests /api/projects/:id/dashboard
   ↓
   Backend queries all tables
   ↓
   Aggregates and calculates metrics
   ↓
   Returns DashboardData object
   ↓
   Parallel requests for browser metrics and test runs
   ↓
   Frontend renders:
      - Core metrics & charts
      - Browser-specific analytics
      - Expandable test runs with details
   ```

## Database Design

### Schema Decisions

**Normalized Design:**
- Separate tables for different data types
- Reduces data duplication
- Improves query performance
- Maintains referential integrity

**Key Tables:**

1. **projects** - Project metadata
2. **test_results** - Raw test execution data (includes browser, os, environment fields)
3. **test_suites** - Grouped test runs
4. **daily_metrics** - Pre-aggregated daily data
5. **flaky_tests** - Flaky test tracking
6. **performance_alerts** - Performance regression tracking
7. **browser_metrics** - Pre-aggregated metrics by browser (NEW)

**Indexing Strategy:**
- Index on `project_id` for filtering
- Index on `created_at` for time-based queries
- Index on `test_id` for test lookups
- Index on `date` in daily_metrics for trendsanalysis

### Data Retention

```sql
-- Archive old data monthly
DELETE FROM test_results 
WHERE created_at < NOW() - INTERVAL '90 days';

-- Aggregate to daily_metrics
-- Keep for 2 years
```
## Metric Calculations

### Flakiness Detection Algorithm

1. It has flakyAttempts > 0 (required retries)
2. It has inconsistent pass/fail across runs

flakinessPercentage = (failedRuns / totalRuns) * 100

// Only count tests with multiple failures
#flaky_tests = COUNT(*) WHERE flakiness_percentage > 10%
```

### Stability Score

```
stability = 100 - flakinessPercentage

// Indicates overall test suite health
```

### Performance Alerting

```
isAlert = (currentDuration > threshold) OR
          (currentDuration > previous * 1.2)
```

## Scalability Considerations

### Current Limits

- Database: ~5M test results
- API: ~100 requests/sec
- Frontend: ~10K concurrent users

### Scaling Strategies

1. **Database Scaling**
   - Partitioning by date on test_results
   - Read replicas for dashboards
   - Archive old data to separate storage

2. **API Scaling**
   - Horizontal scaling with load balancer
   - Redis caching for metrics
   - CDN for static assets

3. **Frontend Optimization**
   - Lazy load charts
   - Virtual scrolling for large tables
   - Service worker for offline support

## Security Considerations

### Current Implementation

1. **Optional API Key Authentication**
   ```
   Authorization: Bearer API_KEY
   ```

2. **CORS Configuration**
   - Whitelist frontend origin
   - Prevent unauthorized access

3. **Input Validation**
   - Validate test result format
   - Sanitize project names
   - Reject oversized payloads

### Future Enhancements

- OAuth2 authentication
- Role-based access control (RBAC)
- API rate limiting
- Data encryption at rest
- Audit logging

## Testing Strategy

### Unit Tests

```typescript
// Test individual services
describe('TestService', () => {
  it('should calculate stability correctly', () => {
    const metrics = testService.calculateStability(testResults);
    expect(metrics.stability).toBe(95);
  });
});
```

### Integration Tests

```typescript
// Test API endpoints
describe('POST /api/tests/batch', () => {
  it('should save test results', async () => {
    const response = await request.post('/api/tests/batch')
      .send(testResultsBatch);
    expect(response.status).toBe(200);
  });
});
```

### E2E Tests

```typescript
// Test full user workflows
test('should display metrics after test submission', async () => {
  // Submit tests
  // Navigate to dashboard
  // Check metrics display
});
```

## Deployment Architecture

### Development

```
Local Machine
├── Backend (localhost:3001)
├── Frontend (localhost:3000)
└── PostgreSQL (localhost:5432)
   (via Docker Compose)
```

### Production

```
AWS / Cloud Provider
├── Frontend (S3 + CloudFront)
├── Backend (ECS / Lambda)
├── Database (RDS PostgreSQL)
└── Cache (ElastiCache Redis)
```

## Monitoring & Observability

### Metrics to Track

```
Backend:
- API response times
- Database query times
- Error rates
- Test result submission rates

Frontend:
- Page load times
- Chart rendering times
- API call latencies
- User interactions
```

### Logging

```typescript
console.log('[Analytics] Test run completed');
console.error('[Analytics] Failed to send results:', error);
```

Future: ELK stack, CloudWatch, DataDog integration

## Future Enhancements

1. **Machine Learning**
   - Predict flaky tests
   - Anomaly detection
   - Root cause analysis

2. **Advanced Features**
   - Webhook notifications
   - Email digest reports
   - Slack/Teams integration
   - Custom dashboards

3. **Performance**
   - Real-time metrics (WebSockets)
   - GraphQL API
   - Caching layer (Redis)

4. **Platform**
   - Mobile app
   - Browser extension
   - VS Code extension
   - CLI tool

---

**Architecture Last Updated:** 2024-01-01
