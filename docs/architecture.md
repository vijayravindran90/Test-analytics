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
│  │              API Routes                                   │   │
│  │  - POST /tests/batch                                     │   │
│  │  - GET /projects/:id/dashboard                           │   │
│  │  - GET /projects/:id/metrics                             │   │
│  │  - GET /projects/:id/flaky-tests                         │   │
│  │  - GET /projects/:id/performance-alerts                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                               │                                   │
│  ┌──────────────────────────▼─────────────────────────────────┐  │
│  │              Service Layer                                 │  │
│  │  - TestService (metrics, aggregation)                     │  │
│  │  - ProjectService (CRUD)                                  │  │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │ SQL
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                            │
│                                                                   │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │ test_results    │  │ daily_metrics    │  │ flaky_tests     │ │
│  │ test_suites     │  │ performance_alerts   │ projects        │ │
│  └─────────────────┘  └──────────────────┘  └─────────────────┘ │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                  Playwright Tests                                 │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  test-analytics-reporter                                │    │
│  │  (Custom Playwright Reporter)                            │    │
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
1. Hooks into test lifecycle (`onTestBegin`, `onTestEnd`, `onEnd`)
2. Collects test execution metrics
3. Batch sends results to backend API
4. Extracts CI/CD environment variables

**Key features:**
- Automatic retry detection
- Flaky test identification
- Configurable batch size (default: 50)
- Non-blocking error handling

**Why separate package?**
- Can be published independently to npm
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

```
App (Router)
├── Pages
│   ├── Projects (list all)
│   └── ProjectDetail (dashboard)
├── Components
│   ├── MetricCard
│   ├── FlakyTestsList
│   ├── PerformanceAlerts
│   └── Charts
└── API
    ├── client.ts (axios instance)
    └── hooks.ts (custom hooks)
```

**Architecture decisions:**

1. **React Router** - Client-side navigation
2. **Custom Hooks** - Data fetching abstraction
3. **Tailwind CSS** - Styling without CSS bloat
4. **Recharts** - Chart visualization

## Data Flow

### Test Execution to Dashboard

1. **Test Runs**
   ```
   Playwright executes tests
   ↓
   Reporter captures results
   ↓
   Batches 50 results
   ↓
   POST /api/tests/batch
   ```

2. **Backend Processing**
   ```
   Receives batch of test results
   ↓
   Validates input
   ↓
   Stores in test_results table
   ↓
   Updates flaky_tests table
   ↓
   Updates daily_metrics table
   ↓
   Checks performance alerts
   ↓
   Returns success response
   ```

3. **Dashboard Display**
   ```
   Frontend requests /api/projects/:id/dashboard
   ↓
   Backend queries all tables
   ↓
   Aggregates and calculates metrics
   ↓
   Returns DashboardData object
   ↓
   Frontend renders charts and tables
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
2. **test_results** - Raw test execution data
3. **test_suites** - Grouped test runs
4. **daily_metrics** - Pre-aggregated daily data
5. **flaky_tests** - Flaky test tracking
6. **performance_alerts** - Performance regression tracking

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

A test is considered flaky if:
1. It has flakyAttempts > 0 (required retries)
2. It has inconsistent pass/fail across runs

```typescript
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
