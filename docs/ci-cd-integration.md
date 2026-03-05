# CI/CD Integration Guide

Integrate the Test Analytics Dashboard with your CI/CD pipeline to automatically track test metrics.

## GitHub Actions

### Setup

1. **Add Repository Secrets**

   Go to Settings → Secrets and variables → Actions, add:
   
   ```
   ANALYTICS_API_URL = https://your-analytics-api.com/api
   PROJECT_ID = github-action-tests
   ANALYTICS_API_KEY = your-optional-api-key
   ```

2. **Add Workflow File**

   Create `.github/workflows/test-analytics.yml`:

   ```yaml
   name: Test Analytics Reporting

   on:
     push:
       branches: [main, develop]
     pull_request:
       branches: [main, develop]

   jobs:
     test:
       runs-on: ubuntu-latest
       
       env:
         ANALYTICS_API_URL: ${{ secrets.ANALYTICS_API_URL }}
         PROJECT_ID: ${{ secrets.PROJECT_ID }}
         PROJECT_NAME: Test Suite
         API_KEY: ${{ secrets.ANALYTICS_API_KEY }}
         CI_BUILD_ID: ${{ github.run_id }}
         CI_COMMIT_SHA: ${{ github.sha }}
         CI_COMMIT_BRANCH: ${{ github.ref_name }}
         CI_COMMIT_AUTHOR: ${{ github.actor }}

       steps:
         - uses: actions/checkout@v4

         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: '18'

         - name: Install dependencies
           run: npm ci

         - name: Install Playwright
           run: npx playwright install --with-deps

         - name: Run tests
           run: npx playwright test
           continue-on-error: true

         - name: Upload report
           if: always()
           uses: actions/upload-artifact@v3
           with:
             name: playwright-report
             path: playwright-report/
             retention-days: 30
   ```

3. **Push and Trigger**

   Push the changes to trigger the workflow. Test results will automatically be reported.

## GitLab CI

### Setup

1. **Add CI/CD Variables**

   Go to Settings → CI/CD → Variables, add:
   
   ```
   ANALYTICS_API_URL = https://your-analytics-api.com/api
   PROJECT_ID = gitlab-tests
   ANALYTICS_API_KEY = your-optional-api-key
   ```

2. **Create `.gitlab-ci.yml`**

   ```yaml
   stages:
     - test

   variables:
     PLAYWRIGHT_VERSION: "1.40"

   test:
     stage: test
     image: mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-jammy
     
     variables:
       CI_BUILD_ID: ${CI_PIPELINE_ID}
       CI_COMMIT_SHA: ${CI_COMMIT_SHA}
       CI_COMMIT_BRANCH: ${CI_COMMIT_BRANCH}
       CI_COMMIT_AUTHOR: ${GITLAB_USER_LOGIN}
       PROJECT_NAME: ${CI_PROJECT_NAME}

     script:
       - npm install
       - npx playwright test
       - echo "Tests completed. Results sent to analytics."

     artifacts:
       when: always
       paths:
         - playwright-report/
       expire_in: 30 days

     only:
       - main
       - develop
       - merge_requests
   ```

3. **Push and Trigger**

   Commit and push to trigger the pipeline.

## Jenkins

### Setup

1. **Install Required Plugins**

   - NodeJS Plugin
   - Generic Webhook Trigger Plugin

2. **Create Freestyle Job**

   ```groovy
   pipeline {
       agent any
       
       environment {
           NODE_ENV = 'test'
           ANALYTICS_API_URL = credentials('analytics-api-url')
           PROJECT_ID = credentials('analytics-project-id')
           ANALYTICS_API_KEY = credentials('analytics-api-key')
           CI_BUILD_ID = "${buildNumber}"
           CI_COMMIT_SHA = "${GIT_COMMIT}"
           CI_COMMIT_BRANCH = "${GIT_BRANCH}"
           CI_COMMIT_AUTHOR = "${BUILD_USER}"
           PROJECT_NAME = "${JOB_NAME}"
       }
       
       stages {
           stage('Checkout') {
               steps {
                   checkout scm
               }
           }
           
           stage('Install Dependencies') {
               steps {
                   sh 'npm install'
               }
           }
           
           stage('Install Playwright') {
               steps {
                   sh 'npx playwright install --with-deps'
               }
           }
           
           stage('Run Tests') {
               steps {
                   sh 'npx playwright test'
               }
           }
       }
       
       post {
           always {
               junit 'test-results/**/*.xml'
               
               publishHTML([
                   reportDir: 'playwright-report',
                   reportFiles: 'index.html',
                   reportName: 'Playwright Report'
               ])
               
               archiveArtifacts artifacts: 'playwright-report/**'
           }
       }
   }
   ```

## Environment Variables Reference

| Variable | Description | GitHub | GitLab | Jenkins |
|----------|-------------|--------|--------|---------|
| `ANALYTICS_API_URL` | Analytics API endpoint | ✓ | ✓ | ✓ |
| `PROJECT_ID` | Unique project identifier | ✓ | ✓ | ✓ |
| `API_KEY` | Optional authentication | ✓ | ✓ | ✓ |
| `CI_BUILD_ID` | Unique build identifier | `github.run_id` | `CI_PIPELINE_ID` | `buildNumber` |
| `CI_COMMIT_SHA` | Commit hash | `github.sha` | `CI_COMMIT_SHA` | `GIT_COMMIT` |
| `CI_COMMIT_BRANCH` | Branch name | `github.ref_name` | `CI_COMMIT_BRANCH` | `GIT_BRANCH` |
| `CI_COMMIT_AUTHOR` | Commit author | `github.actor` | `GITLAB_USER_LOGIN` | `BUILD_USER` |

## Monitoring Analytics

### View Results

1. Access your dashboard: `http://your-analytics-url`
2. Select your project
3. View metrics, trends, flaky tests, and alerts

### Create Alerts

Set up notifications when:
- Pass rate drops below threshold
- Flaky tests exceed percentage
- Test duration increases
- Performance regressions detected

### Export Reports

Generate reports for:
- Stakeholder presentations
- Management reviews
- Performance analysis
- Historical comparisons

## Troubleshooting

### Tests Not Reporting

1. **Check API connectivity:**
   ```bash
   curl -X GET http://your-api/health
   ```

2. **Verify environment variables:**
   ```bash
   echo $ANALYTICS_API_URL
   echo $PROJECT_ID
   ```

3. **Check Playwright config:**
   - Ensure reporter is enabled
   - Verify `backendUrl` matches `ANALYTICS_API_URL`

4. **Review logs:**
   - Check CI/CD job logs for reporter output
   - Look for "Analytics" log messages

### Authentication Issues

If using API key:
```yaml
headers:
  Authorization: Bearer YOUR_API_KEY
```

### Firewall/Network

If analytics server is behind firewall:
- Whitelist CI/CD IP addresses
- Use VPN or private network
- Configure proxy if needed

## Performance Optimization

### Batch Test Results

Reporter automatically batches results (50 at a time):
```typescript
{
  batchSize: 50,  // Configurable
  enabled: true
}
```

### Reduce Data

For high-volume test suites:
- Archive old results periodically
- Enable data retention policies
- Use database compression

### Monitor Latency

Track reporting latency:
```javascript
console.time('Analytics');
// ... test execution
console.timeEnd('Analytics');
```

## Best Practices

1. **Use Unique Project IDs**
   ```bash
   PROJECT_ID = ${GITHUB_REPOSITORY}  # e.g., org/repo
   ```

2. **Tag Tests for Filtering**
   ```javascript
   test('critical path', { tag: '@critical' }, async () => {})
   ```

3. **Set Performance Thresholds**
   - Define acceptable test duration
   - Alert on significant increases
   - Track trends over time

4. **Regular Cleanup**
   - Archive results older than 90 days
   - Review and remove obsolete tests
   - Maintain project structure

5. **Documentation**
   - Document test naming conventions
   - Maintain test specifications
   - Track known flaky tests

## Advanced Integration

### Custom Metrics

Extend the reporter for custom metrics:

```typescript
export interface CustomMetrics {
  coverage: number;
  memoryUsage: number;
  apiResponseTime: number;
}
```

### Webhooks

Trigger external actions on test events:
```bash
POST /webhooks/test-complete
{
  projectId: "...",
  status: "success",
  metrics: {...}
}
```

### Database Replication

For high availability:
- Setup PostgreSQL replication
- Configure read replicas
- Enable automatic failover

---

**Your CI/CD pipeline is now connected to test analytics!** 🎯
