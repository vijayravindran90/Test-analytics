import express, { Request, Response } from 'express';
import testService from '../services/testService';
import projectService from '../services/projectService';
import pool from '../db';

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
}

interface DashboardData {
  metrics: any;
  flakyTests: any[];
  performanceAlerts: any[];
  recentTests: TestResult[];
  trends: any[];
}

const router = express.Router();

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
      };
    });

    // Save test results
    await testService.saveTestResults(testResults);

    res.json({
      success: true,
      message: `Saved ${results.length} test results`,
      projectId: project.id,
    });
  } catch (error) {
    console.error('Error saving test results:', error);
    res.status(500).json({ error: 'Failed to save test results' });
  }
});

// Get dashboard data for a project
router.get('/projects/:projectId/dashboard', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { days = 30 } = req.query;

    const project = await projectService.getProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

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
router.get('/projects/:projectId/metrics', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { days = 30 } = req.query;

    const metrics = await testService.getProjectMetrics(projectId, parseInt(days as string));
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Get flaky tests
router.get('/projects/:projectId/flaky-tests', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { limit = 10 } = req.query;

    const flakyTests = await testService.getFlakyTests(projectId, parseInt(limit as string));
    res.json(flakyTests);
  } catch (error) {
    console.error('Error fetching flaky tests:', error);
    res.status(500).json({ error: 'Failed to fetch flaky tests' });
  }
});

// Get performance alerts
router.get('/projects/:projectId/performance-alerts', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { limit = 10 } = req.query;

    const alerts = await testService.getPerformanceAlerts(projectId, parseInt(limit as string));
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching performance alerts:', error);
    res.status(500).json({ error: 'Failed to fetch performance alerts' });
  }
});

// Get metrics trend
router.get('/projects/:projectId/trends', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { days = 30 } = req.query;

    const trends = await testService.getMetricsTrend(projectId, parseInt(days as string));
    res.json(trends);
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

// Get recent tests
router.get('/projects/:projectId/recent-tests', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { limit = 20 } = req.query;

    const tests = await testService.getRecentTests(projectId, parseInt(limit as string));
    res.json(tests);
  } catch (error) {
    console.error('Error fetching recent tests:', error);
    res.status(500).json({ error: 'Failed to fetch recent tests' });
  }
});

// Get browser metrics
router.get('/projects/:projectId/browser-metrics', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const browserMetrics = await testService.getBrowserMetrics(projectId);
    res.json(browserMetrics);
  } catch (error) {
    console.error('Error fetching browser metrics:', error);
    res.status(500).json({ error: 'Failed to fetch browser metrics' });
  }
});

// Get tests by specific browser
router.get('/projects/:projectId/tests/browser/:browser', async (req: Request, res: Response) => {
  try {
    const { projectId, browser } = req.params;
    const { limit = 50 } = req.query;

    const tests = await testService.getTestsByBrowser(projectId, browser, parseInt(limit as string));
    res.json(tests);
  } catch (error) {
    console.error('Error fetching tests by browser:', error);
    res.status(500).json({ error: 'Failed to fetch tests by browser' });
  }
});

// Get browser metrics trend
router.get('/projects/:projectId/browser-trends', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { days = 30 } = req.query;

    const trends = await testService.getBrowserMetricsTrend(projectId, parseInt(days as string));
    res.json(trends);
  } catch (error) {
    console.error('Error fetching browser trends:', error);
    res.status(500).json({ error: 'Failed to fetch browser trends' });
  }
});

// Get test runs (grouped executions)
router.get('/projects/:projectId/test-runs', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { limit = 20 } = req.query;

    const runs = await testService.getTestRuns(projectId, parseInt(limit as string));
    res.json(runs);
  } catch (error) {
    console.error('Error fetching test runs:', error);
    res.status(500).json({ error: 'Failed to fetch test runs' });
  }
});

// Get tests in a specific run
router.get('/projects/:projectId/test-runs/:runId/tests', async (req: Request, res: Response) => {
  try {
    const { projectId, runId } = req.params;

    const tests = await testService.getTestsByRun(projectId, decodeURIComponent(runId));
    res.json(tests);
  } catch (error) {
    console.error('Error fetching tests in run:', error);
    res.status(500).json({ error: 'Failed to fetch tests in run' });
  }
});

// Diagnostic endpoint - get test count and sample data
router.get('/projects/:projectId/diagnostic', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

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
router.post('/projects', async (req: Request, res: Response) => {
  try {
    const { name, description, owner } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const project = await projectService.createProject(name, description, owner);
    res.json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

router.get('/projects', async (req: Request, res: Response) => {
  try {
    const projects = await projectService.getAllProjects();
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

router.get('/projects/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const project = await projectService.getProject(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

router.put('/projects/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const updates = req.body;

    const project = await projectService.updateProject(projectId, updates);
    res.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

router.delete('/projects/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    await projectService.deleteProject(projectId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
