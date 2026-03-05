import express, { Request, Response } from 'express';
import testService from '../services/testService';
import projectService from '../services/projectService';

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
    const { results, projectId } = req.body;

    if (!Array.isArray(results)) {
      return res.status(400).json({ error: 'Results must be an array' });
    }

    // Get project
    const project = await projectService.getProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Transform results to TestResult format
    const testResults: TestResult[] = results.map((result: any) => ({
      id: result.id,
      projectId,
      projectName: project.name,
      testId: result.id,
      testName: result.name,
      status: result.status.toUpperCase() as 'PASSED' | 'FAILED' | 'SKIPPED' | 'TIMEOUT',
      duration: result.duration,
      retries: 0,
      flakyAttempts: 0,
      startTime: new Date(result.timestamp),
      endTime: new Date(new Date(result.timestamp).getTime() + result.duration),
      error: result.error,
      tags: [],
      browser: 'unknown',
      os: 'unknown',
      environment: 'unknown',
    }));

    // Save test results
    await testService.saveTestResults(testResults);

    res.json({
      success: true,
      message: `Saved ${results.length} test results`,
      projectId,
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
