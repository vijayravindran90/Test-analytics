import express, { Request, Response } from 'express';
import testService from '../services/testService';
import projectService from '../services/projectService';
import pool from '../db';
import userService from '../services/userService';
import { signAuthToken } from '../auth';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';

interface TestResult {
  id: string;
  projectId: string;
  projectName: string;
  testId: string;
  testName: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED' | 'TIMEOUT';
  duration: number;
  retries: number;
  flakyAttempts: number;
  startTime: Date;
  endTime: Date;
  error?: string;
  tags?: string[];
  browser?: string;
  os?: string;
  environment?: string;
  buildId?: string;
  commitHash?: string;
  branchName?: string;
  author?: string;
  traceUrl?: string;
  tracePath?: string;
  traceDataBase64?: string;
  traceFileName?: string;
}

interface DashboardData {
  metrics: any;
  flakyTests: any[];
  performanceAlerts: any[];
  recentTests: TestResult[];
  trends: any[];
}

const router = express.Router();

async function ensureProjectAccess(req: AuthenticatedRequest, res: Response): Promise<string | null> {
  const { projectId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }

  const project = await projectService.getProject(projectId, userId);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return null;
  }

  return projectId;
}

router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const user = await userService.register(String(email), String(password), name ? String(name) : undefined);
    const token = signAuthToken({ userId: user.id, email: user.email });

    res.status(201).json({
      token,
      user,
    });
  } catch (error: any) {
    if (error?.message?.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }

    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await userService.login(String(email), String(password));

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signAuthToken({ userId: user.id, email: user.email });

    res.json({ token, user });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

router.get('/auth/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await userService.getUserById(req.user!.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Save test results
router.post('/tests/batch', async (req: Request, res: Response) => {
  try {
    const { results, projectId, projectName } = req.body;

    if (!Array.isArray(results)) {
      return res.status(400).json({ error: 'Results must be an array' });
    }

    // Ensure project exists
    let project = await projectService.getProject(projectId);
    if (!project) {
      project = await projectService.createProject(
        projectName || 'Unknown Project',
        'Auto-created from reporter upload',
        'unknown'
      );
    }

    // Transform results to TestResult format
    const testResults: TestResult[] = results.map((result: any) => {
      const statusValue = String(result.status || 'FAILED').toUpperCase();
      const mappedStatus = (['PASSED', 'FAILED', 'SKIPPED', 'TIMEOUT'].includes(statusValue)
        ? statusValue
        : 'FAILED') as 'PASSED' | 'FAILED' | 'SKIPPED' | 'TIMEOUT';

      const duration = Number(result.duration || 0);
      const start = result.startTime ? new Date(result.startTime) : (result.timestamp ? new Date(result.timestamp) : new Date());
      const end = result.endTime
        ? new Date(result.endTime)
        : new Date(start.getTime() + Math.max(0, duration));

      return {
        id: result.id,
        projectId: project!.id,
        projectName: project!.name,
        testId: result.testId || result.id,
        testName: result.testName || result.name || 'Unnamed Test',
        status: mappedStatus,
        duration,
        retries: Number(result.retries || 0),
        flakyAttempts: Number(result.flakyAttempts || 0),
        startTime: start,
        endTime: end,
        error: result.error,
        tags: Array.isArray(result.tags) ? result.tags : [],
        browser: result.browser || 'unknown',
        os: result.os || 'unknown',
        environment: result.environment || 'unknown',
        buildId: result.buildId,
        commitHash: result.commitHash,
        branchName: result.branchName,
        author: result.author,
        traceUrl: result.traceUrl,
        tracePath: result.tracePath,
        traceDataBase64: result.traceDataBase64,
        traceFileName: result.traceFileName,
      };
    });

    // Save test results
    await testService.saveTestResults(testResults);

    res.json({
      success: true,
      message: `Saved ${results.length} test results`,
      projectId: project.id,
    });
  } catch (error: any) {
    console.error('Error saving test results:', error);
    const errorMessage = error?.message || 'Unknown error';
    const errorStack = error?.stack || '';
    console.error('Error details:', { message: errorMessage, stack: errorStack });
    res.status(500).json({ 
      error: 'Failed to save test results',
      details: errorMessage,
      // Include stack trace in non-production for debugging
      ...(process.env.NODE_ENV !== 'production' && { stack: errorStack })
    });
  }
});

// Get dashboard data for a project
router.get('/projects/:projectId/dashboard', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = await ensureProjectAccess(req, res);
    if (!projectId) {
      return;
    }
    const { days = 30 } = req.query;

    const [metrics, flakyTests, performanceAlerts, recentTests, trends] = await Promise.all([
      testService.getProjectMetrics(projectId, parseInt(days as string)),
      testService.getFlakyTests(projectId),
      testService.getPerformanceAlerts(projectId),
      testService.getRecentTests(projectId),
      testService.getMetricsTrend(projectId, parseInt(days as string)),
    ]);

    const data: DashboardData = {
      metrics,
      flakyTests,
      performanceAlerts,
      recentTests,
      trends,
    };

    res.json(data);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get metrics for a project
router.get('/projects/:projectId/metrics', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = await ensureProjectAccess(req, res);
    if (!projectId) {
      return;
    }
    const { days = 30 } = req.query;

    const metrics = await testService.getProjectMetrics(projectId, parseInt(days as string));
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Get flaky tests
router.get('/projects/:projectId/flaky-tests', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = await ensureProjectAccess(req, res);
    if (!projectId) {
      return;
    }
    const { limit = 10 } = req.query;

    const flakyTests = await testService.getFlakyTests(projectId, parseInt(limit as string));
    res.json(flakyTests);
  } catch (error) {
    console.error('Error fetching flaky tests:', error);
    res.status(500).json({ error: 'Failed to fetch flaky tests' });
  }
});

// Get performance alerts
router.get('/projects/:projectId/performance-alerts', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = await ensureProjectAccess(req, res);
    if (!projectId) {
      return;
    }
    const { limit = 10 } = req.query;

    const alerts = await testService.getPerformanceAlerts(projectId, parseInt(limit as string));
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching performance alerts:', error);
    res.status(500).json({ error: 'Failed to fetch performance alerts' });
  }
});

// Get metrics trend
router.get('/projects/:projectId/trends', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = await ensureProjectAccess(req, res);
    if (!projectId) {
      return;
    }
    const { days = 30 } = req.query;

    const trends = await testService.getMetricsTrend(projectId, parseInt(days as string));
    res.json(trends);
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

// Get recent tests
router.get('/projects/:projectId/recent-tests', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = await ensureProjectAccess(req, res);
    if (!projectId) {
      return;
    }
    const { limit = 20 } = req.query;

    const tests = await testService.getRecentTests(projectId, parseInt(limit as string));
    res.json(tests);
  } catch (error) {
    console.error('Error fetching recent tests:', error);
    res.status(500).json({ error: 'Failed to fetch recent tests' });
  }
});

// Get browser metrics
router.get('/projects/:projectId/browser-metrics', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = await ensureProjectAccess(req, res);
    if (!projectId) {
      return;
    }

    const browserMetrics = await testService.getBrowserMetrics(projectId);
    res.json(browserMetrics);
  } catch (error) {
    console.error('Error fetching browser metrics:', error);
    res.status(500).json({ error: 'Failed to fetch browser metrics' });
  }
});

// Get tests by specific browser
router.get('/projects/:projectId/tests/browser/:browser', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = await ensureProjectAccess(req, res);
    if (!projectId) {
      return;
    }
    const { browser } = req.params;
    const { limit = 50 } = req.query;

    const tests = await testService.getTestsByBrowser(projectId, browser, parseInt(limit as string));
    res.json(tests);
  } catch (error) {
    console.error('Error fetching tests by browser:', error);
    res.status(500).json({ error: 'Failed to fetch tests by browser' });
  }
});

// Get browser metrics trend
router.get('/projects/:projectId/browser-trends', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = await ensureProjectAccess(req, res);
    if (!projectId) {
      return;
    }
    const { days = 30 } = req.query;

    const trends = await testService.getBrowserMetricsTrend(projectId, parseInt(days as string));
    res.json(trends);
  } catch (error) {
    console.error('Error fetching browser trends:', error);
    res.status(500).json({ error: 'Failed to fetch browser trends' });
  }
});

// Get test runs (grouped executions)
router.get('/projects/:projectId/test-runs', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = await ensureProjectAccess(req, res);
    if (!projectId) {
      return;
    }
    const { limit = 20 } = req.query;

    const runs = await testService.getTestRuns(projectId, parseInt(limit as string));
    res.json(runs);
  } catch (error) {
    console.error('Error fetching test runs:', error);
    res.status(500).json({ error: 'Failed to fetch test runs' });
  }
});

// Get tests in a specific run
router.get('/projects/:projectId/test-runs/:runId/tests', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = await ensureProjectAccess(req, res);
    if (!projectId) {
      return;
    }
    const { runId } = req.params;

    const tests = await testService.getTestsByRun(projectId, decodeURIComponent(runId));
    res.json(tests);
  } catch (error) {
    console.error('Error fetching tests in run:', error);
    res.status(500).json({ error: 'Failed to fetch tests in run' });
  }
});

// Serve stored trace zip for a test result
router.get('/traces/:testResultId/download', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { testResultId } = req.params;
    const trace = await testService.getTraceFileByTestResultIdForUser(testResultId, req.user!.id);

    if (!trace) {
      return res.status(404).json({ error: 'Trace not found' });
    }

    const buffer = Buffer.from(trace.contentBase64, 'base64');
    
    // Set headers for trace file serving
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `inline; filename="${trace.fileName}"`);
    res.setHeader('Content-Length', buffer.length.toString());
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow trace.playwright.dev to fetch
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    
    res.send(buffer);
  } catch (error) {
    console.error('Error serving trace file:', error);
    res.status(500).json({ error: 'Failed to serve trace file' });
  }
});

// Diagnostic endpoint - get test count and sample data
router.get('/projects/:projectId/diagnostic', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = await ensureProjectAccess(req, res);
    if (!projectId) {
      return;
    }

    // Get total test count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total_count FROM test_results WHERE project_id = $1`,
      [projectId]
    );

    // Get sample of recent tests
    const sampleResult = await pool.query(
      `SELECT id, test_name, status, browser, build_id, created_at FROM test_results 
       WHERE project_id = $1 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [projectId]
    );

    // Get run grouping info
    const runsResult = await pool.query(
      `SELECT COALESCE(build_id, DATE_TRUNC('minute', created_at)::text) as run_id, COUNT(*) as count
       FROM test_results
       WHERE project_id = $1
       GROUP BY COALESCE(build_id, DATE_TRUNC('minute', created_at)::text)
       ORDER BY MAX(created_at) DESC
       LIMIT 10`,
      [projectId]
    );

    res.json({
      totalTests: parseInt(countResult.rows[0]?.total_count) || 0,
      recentSamples: sampleResult.rows,
      runGroups: runsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching diagnostic data:', error);
    res.status(500).json({ error: 'Failed to fetch diagnostic data' });
  }
});

// Projects CRUD
router.post('/projects', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description, owner } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const project = await projectService.createProject(
      name,
      description,
      owner || req.user?.email,
      req.user!.id
    );
    res.json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

router.get('/projects', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projects = await projectService.getAllProjects(req.user!.id);
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

router.get('/projects/:projectId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const project = await projectService.getProject(projectId, req.user!.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

router.put('/projects/:projectId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const updates = req.body;

    const project = await projectService.updateProject(projectId, updates, req.user!.id);
    res.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

router.delete('/projects/:projectId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    await projectService.deleteProject(projectId, req.user!.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Run database migrations
router.post('/admin/migrate', async (req: Request, res: Response) => {
  try {
    const { adminKey } = req.body;

    // Simple admin key check (in production, use proper authentication)
    if (adminKey !== process.env.ADMIN_KEY && adminKey !== 'migrate-db-schema') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const [columnCheck, tableCheck] = await Promise.all([
      pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'test_results'
        AND column_name IN ('trace_url', 'trace_path')
      `),
      pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'trace_files'
      `),
    ]);

    if (columnCheck.rows.length === 2 && tableCheck.rows.length === 1) {
      return res.json({
        success: true,
        message: 'Migrations already applied',
        columns: columnCheck.rows.map((r) => r.column_name),
        tables: tableCheck.rows.map((r) => r.table_name),
      });
    }

    await pool.query('BEGIN');

    try {
      await pool.query(`
        ALTER TABLE test_results ADD COLUMN IF NOT EXISTS trace_url TEXT;
        ALTER TABLE test_results ADD COLUMN IF NOT EXISTS trace_path TEXT;

        CREATE INDEX IF NOT EXISTS idx_test_results_status_trace ON test_results(status, trace_url) WHERE trace_url IS NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_test_results_failed_with_trace ON test_results(project_id, status) WHERE status = 'FAILED' AND trace_url IS NOT NULL;

        CREATE TABLE IF NOT EXISTS trace_files (
          id UUID PRIMARY KEY,
          test_result_id UUID NOT NULL REFERENCES test_results(id) ON DELETE CASCADE,
          file_name VARCHAR(255),
          content_base64 TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(test_result_id)
        );

        CREATE INDEX IF NOT EXISTS idx_trace_files_test_result_id ON trace_files(test_result_id);
      `);

      await pool.query('COMMIT');

      res.json({
        success: true,
        message: 'Migrations applied successfully',
        applied: ['trace_url column', 'trace_path column', 'trace indexes', 'trace_files table'],
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: 'Failed to run migrations' });
  }
});

export default router;
