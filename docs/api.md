# API Documentation

Complete API reference for the Test Analytics Backend.

## Base URL

```
http://localhost:3001/api
```

## Authentication

Optional API key authentication via headers:

```
Authorization: Bearer YOUR_API_KEY
```

## Response Format

All responses are JSON:

```json
{
  "data": {},
  "error": null,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## Endpoints

### Health Check

Check if the API is running:

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## Projects

### Get All Projects

List all projects:

```http
GET /api/projects
```

**Query Parameters:** None

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "My Project",
    "description": "Project description",
    "owner": "John Doe",
    "createdAt": "2024-01-01T12:00:00Z",
    "updatedAt": "2024-01-01T12:00:00Z"
  }
]
```

### Get Project

Get a specific project:

```http
GET /api/projects/:projectId
```

**Parameters:**
- `projectId` (path, required) - UUID of the project

**Response:** Single project object

### Create Project

Create a new project:

```http
POST /api/projects
```

**Body:**
```json
{
  "name": "My Project",
  "description": "Optional description",
  "owner": "Optional owner name"
}
```

**Response:** Created project object

### Update Project

Update project details:

```http
PUT /api/projects/:projectId
```

**Parameters:**
- `projectId` (path, required) - UUID of the project

**Body:**
```json
{
  "name": "Updated name",
  "description": "Updated description",
  "owner": "Updated owner"
}
```

**Response:** Updated project object

### Delete Project

Delete a project and all associated data:

```http
DELETE /api/projects/:projectId
```

**Parameters:**
- `projectId` (path, required) - UUID of the project

**Response:**
```json
{
  "success": true
}
```

---

## Test Results

### Submit Test Results (Batch)

Submit multiple test results:

```http
POST /api/tests/batch
```

**Body:**
```json
{
  "results": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "projectName": "My Project",
      "testId": "path/to/test.spec.ts::test-name",
      "testName": "Test Name",
      "status": "PASSED|FAILED|SKIPPED|TIMEOUT",
      "duration": 1500,
      "retries": 0,
      "flakyAttempts": 0,
      "startTime": "2024-01-01T12:00:00Z",
      "endTime": "2024-01-01T12:00:01Z",
      "error": "optional error message",
      "tags": ["@critical", "@smoke"],
      "browser": "chromium",
      "environment": "staging",
      "buildId": "build-123",
      "commitHash": "abc123def",
      "branchName": "main",
      "author": "john.doe"
    }
  ],
  "projectId": "uuid",
  "projectName": "My Project",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Saved 5 test results",
  "projectId": "uuid"
}
```

---

## Analytics & Dashboard

### Get Dashboard Data

Get complete dashboard data for a project:

```http
GET /api/projects/:projectId/dashboard
```

**Parameters:**
- `projectId` (path, required) - UUID of the project

**Query Parameters:**
- `days` (optional, default: 30) - Number of days to include

**Response:**
```json
{
  "metrics": {
    "totalTests": 100,
    "passedTests": 95,
    "failedTests": 3,
    "skippedTests": 2,
    "passRate": 95.0,
    "avgDuration": 1250,
    "totalDuration": 125000,
    "flakinessPercentage": 2.5,
    "failureRate": 3.0,
    "stability": 97.5
  },
  "flakyTests": [
    {
      "testId": "path/to/test::name",
      "testName": "Test Name",
      "flakinessPercentage": 33.33,
      "totalRuns": 9,
      "passedRuns": 6,
      "failedRuns": 3,
      "lastFlakeDate": "2024-01-01T12:00:00Z",
      "trend": "improving|degrading|stable"
    }
  ],
  "performanceAlerts": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "testId": "path/to/test::name",
      "testName": "Test Name",
      "threshold": 5000,
      "currentDuration": 6500,
      "previousDuration": 4000,
      "percentageIncrease": 62.5,
      "alertedAt": "2024-01-01T12:00:00Z"
    }
  ],
  "recentTests": [
    {
      "id": "uuid",
      "status": "PASSED",
      "duration": 1250,
      "startTime": "2024-01-01T12:00:00Z",
      "endTime": "2024-01-01T12:00:01Z"
    }
  ],
  "trends": [
    {
      "date": "2024-01-01",
      "metrics": {
        "passRate": 95.0,
        "failureRate": 3.0,
        "flakinessPercentage": 2.5,
        "stability": 97.5,
        "totalTests": 100,
        "passedTests": 95,
        "failedTests": 3,
        "skippedTests": 2,
        "avgDuration": 1250,
        "totalDuration": 125000
      }
    }
  ]
}
```

### Get Metrics

Get metrics for a project:

```http
GET /api/projects/:projectId/metrics
```

**Parameters:**
- `projectId` (path, required) - UUID of the project

**Query Parameters:**
- `days` (optional, default: 30) - Number of days to include

**Response:** Metrics object (see Dashboard response)

### Get Flaky Tests

Get list of flaky tests:

```http
GET /api/projects/:projectId/flaky-tests
```

**Parameters:**
- `projectId` (path, required) - UUID of the project

**Query Parameters:**
- `limit` (optional, default: 10) - Maximum number of results

**Response:** Array of flaky test objects

### Get Performance Alerts

Get performance regression alerts:

```http
GET /api/projects/:projectId/performance-alerts
```

**Parameters:**
- `projectId` (path, required) - UUID of the project

**Query Parameters:**
- `limit` (optional, default: 10) - Maximum number of results

**Response:** Array of performance alert objects

### Get Metrics Trends

Get historical metrics trends:

```http
GET /api/projects/:projectId/trends
```

**Parameters:**
- `projectId` (path, required) - UUID of the project

**Query Parameters:**
- `days` (optional, default: 30) - Number of days to include

**Response:** Array of trend objects (see Dashboard response)

### Get Browser Metrics

Get aggregated metrics by browser:

```http
GET /api/projects/:projectId/browser-metrics
```

**Parameters:**
- `projectId` (path, required) - UUID of the project

**Response:**
```json
[
  {
    "browser": "chromium",
    "totalTests": 150,
    "passedTests": 145,
    "failedTests": 3,
    "skippedTests": 2,
    "avgDuration": 2500.50,
    "totalDuration": 375075,
    "passRate": 96.67
  },
  {
    "browser": "firefox",
    "totalTests": 150,
    "passedTests": 142,
    "failedTests": 5,
    "skippedTests": 3,
    "avgDuration": 2650.25,
    "totalDuration": 397537,
    "passRate": 94.67
  }
]
```

### Get Browser Trends

Get browser metrics over time:

```http
GET /api/projects/:projectId/browser-trends
```

**Parameters:**
- `projectId` (path, required) - UUID of the project

**Query Parameters:**
- `days` (optional, default: 30) - Number of days to include

**Response:**
```json
[
  {
    "date": "2024-03-07",
    "browser": "chromium",
    "totalTests": 50,
    "passedTests": 48,
    "failedTests": 2,
    "passRate": 96.00
  }
]
```

### Get Tests by Browser

Get test results filtered by browser:

```http
GET /api/projects/:projectId/tests/browser/:browser
```

**Parameters:**
- `projectId` (path, required) - UUID of the project
- `browser` (path, required) - Browser name (chromium, firefox, webkit)

**Query Parameters:**
- `limit` (optional, default: 50) - Maximum number of results

**Response:** Array of test result objects

---

## Test Runs

### Get Test Runs

Get list of test run executions (grouped by buildId or time windows):

```http
GET /api/projects/:projectId/test-runs
```

**Parameters:**
- `projectId` (path, required) - UUID of the project

**Query Parameters:**
- `limit` (optional, default: 20) - Maximum number of runs

**Response:**
```json
[
  {
    "runId": "build-12345",
    "startTime": "2024-03-07T10:30:00Z",
    "endTime": "2024-03-07T10:45:00Z",
    "totalTests": 50,
    "passedTests": 48,
    "failedTests": 2,
    "skippedTests": 0,
    "totalDuration": 900000,
    "avgDuration": 18000,
    "passRate": 96.00,
    "branchName": "main",
    "commitHash": "abc123def456",
    "author": "developer@example.com"
  }
]
```

### Get Tests in Run

Get all test results from a specific test run:

```http
GET /api/projects/:projectId/test-runs/:runId/tests
```

**Parameters:**
- `projectId` (path, required) - UUID of the project
- `runId` (path, required) - Test run ID (from test-runs endpoint)

**Response:** Array of test result objects with full details

---

## Error Responses

### 400 Bad Request

```json
{
  "error": "Invalid request parameters"
}
```

### 401 Unauthorized

```json
{
  "error": "Invalid or missing API key"
}
```

### 404 Not Found

```json
{
  "error": "Project not found"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error"
}
```

---

## Rate Limiting

Currently no rate limiting is implemented. Subject to change in production.

## Data Types

### Test Status

- `PASSED` - Test executed successfully
- `FAILED` - Test execution failed
- `SKIPPED` - Test was skipped
- `TIMEOUT` - Test exceeded timeout

### Trend Type

- `improving` - Metric is improving over time
- `degrading` - Metric is getting worse
- `stable` - Metric is stable

### Metrics

All metrics are calculated automatically:

- **Pass Rate**: Percentage of passed tests
- **Failure Rate**: Percentage of failed tests
- **Flakiness**: Percentage of tests with inconsistent results
- **Stability**: 100 - Flakiness
- **Average Duration**: Mean test execution time
- **Total Duration**: Sum of all test execution times

---

## Examples

### Submit Test Results with cURL

```bash
curl -X POST http://localhost:3001/api/tests/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "results": [
      {
        "id": "test-123",
        "projectId": "proj-1",
        "projectName": "My Project",
        "testId": "tests/auth.spec.ts::login",
        "testName": "should login successfully",
        "status": "PASSED",
        "duration": 2150,
        "retries": 0,
        "flakyAttempts": 0,
        "startTime": "2024-01-01T12:00:00Z",
        "endTime": "2024-01-01T12:00:02Z"
      }
    ],
    "projectId": "proj-1",
    "projectName": "My Project"
  }'
```

### Get Dashboard Data with JavaScript

```javascript
const projectId = 'my-project-id';
const response = await fetch(
  `/api/projects/${projectId}/dashboard?days=30`
);
const data = await response.json();
console.log(data.metrics.passRate);
```

### Get Flaky Tests with Python

```python
import requests

response = requests.get(
    'http://localhost:3001/api/projects/my-project-id/flaky-tests',
    params={'limit': 5}
)
flaky_tests = response.json()
for test in flaky_tests:
    print(f"{test['testName']}: {test['flakinessPercentage']}%")
```

---

## SDK/Libraries

### JavaScript/TypeScript

```typescript
import apiClient from '@test-analytics/api-client';

const dashboard = await apiClient.getDashboard('project-id');
console.log(dashboard.metrics);
```

---

**API Version:** 1.0.0  
**Last Updated:** 2024-01-01  
**Base URL:** `/api`
