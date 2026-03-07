# test-analytics-reporter

A Playwright test reporter that sends test results to the Test Analytics Dashboard.

## Features

- 📊 **Real-time Test Metrics** - Track pass rate, failure rate, flakiness, and performance
- 🔍 **Trace Viewer Integration** - Upload and view Playwright traces directly in the hosted viewer
- 🌐 **Browser Tracking** - Automatic detection and tracking of Chromium, Firefox, and Safari
- 📈 **Historical Analysis** - Track test trends and stability over time
- 🔄 **Flaky Test Detection** - Identify and monitor tests with inconsistent behavior
- ⚡ **Performance Alerts** - Get notified of slow tests and performance regressions
- 🔧 **CI/CD Ready** - Seamless integration with GitHub Actions and other CI systems

## Installation

```bash
npm install test-analytics-reporter
```

## Usage

Add the reporter to your `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: [
    ['html'],
    [
      'test-analytics-reporter',
      {
        backendUrl: process.env.ANALYTICS_API_URL || 'http://localhost:3001/api',
        projectId: process.env.PROJECT_ID || 'default-project',
        projectName: process.env.PROJECT_NAME || 'Default Project',
        apiKey: process.env.API_KEY,
        enabled: true,
      },
    ],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    // Enable trace collection for failed tests (required for trace viewer integration)
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
```

## Environment Variables

- `ANALYTICS_API_URL` - The Test Analytics API endpoint (default: `http://localhost:3001/api`)
- `PROJECT_ID` - Your project ID in the analytics dashboard
- `PROJECT_NAME` - Display name for your project
- `API_KEY` - Optional API key for authentication

## Configuration

### Reporter Options

```typescript
{
  backendUrl: string;      // Test Analytics API URL
  projectId: string;       // Project identifier
  projectName?: string;    // Project display name
  apiKey?: string;         // Optional API key
  enabled?: boolean;       // Enable/disable reporter (default: true)
}
```

### Trace File Support

The reporter automatically uploads Playwright trace files (up to 8MB) for failed tests, allowing you to view them directly in the hosted [Playwright Trace Viewer](https://trace.playwright.dev).

**Important:** To enable trace collection, add this to your `playwright.config.ts`:

```typescript
use: {
  trace: 'retain-on-failure', // Captures trace files for failed tests
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
}
```

**Trace Options:**
- `retain-on-failure` - Only capture traces for failed tests (recommended)
- `on` - Capture traces for all tests (increases storage)
- `on-first-retry` - Only capture on retry attempts
- `off` - Disable trace collection

Once configured, failed tests in the dashboard will have a "View Trace" button that opens the interactive trace viewer.

## How It Works

1. Runs your Playwright tests
2. Collects test results and metrics
3. Sends data to Test Analytics Dashboard
4. Displays pass rate, failure rate, flakiness, and performance metrics

## Example GitHub Actions Usage

```yaml
name: Run Tests with Analytics

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18

      - run: npm ci
      - run: npm install @reporter/test-analytics-reporter
      - run: npx playwright install --with-deps

      - name: Run Playwright Tests
        run: npx playwright test
        env:
          ANALYTICS_API_URL: ${{ secrets.ANALYTICS_API_URL }}
          PROJECT_ID: ${{ secrets.PROJECT_ID }}
          PROJECT_NAME: 'My Project'
```

## License

MIT

## Support

For issues and feature requests, visit: https://github.com/vijayravindran90/Test-analytics
