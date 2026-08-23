import express, { Request, Response } from 'express';
import { validate as validateUuid } from 'uuid';
import { PLANS, PlanId, BillingInterval, getPlanById } from 'test-analytics-shared';
import testService from '../services/testService';
import projectService from '../services/projectService';
import pool from '../db';
import userService from '../services/userService';
import { signAuthToken, verifyAuthToken } from '../auth';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { isGoogleSignInConfigured, verifyGoogleIdToken } from '../services/googleAuth';
import { createSubscriptionCheckout, cancelSubscription, isBillingConfigured } from '../services/billingService';
import { sendVerificationEmail } from '../services/emailService';
import { seedTestAccount, DEFAULT_TEST_ACCOUNT_EMAIL } from '../services/testAccountService';
import { seedDemoProject } from '../services/demoDataService';

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
  imagePath?: string;
  imageDataBase64?: string;
  imageFileName?: string;
  imageContentType?: string;
}

interface DashboardData {
  metrics: any;
  flakyTests: any[];
  performanceAlerts: any[];
  recentTests: TestResult[];
  trends: any[];
}

const router = express.Router();

const TRIAL_EXPIRED_MESSAGE = 'Your free trial has ended. Upgrade your plan to keep using Test Analytics.';
const EMAIL_NOT_VERIFIED_MESSAGE = 'Please verify your email address to continue.';

function frontendUrl(): string {
  return process.env.FRONTEND_URL || 'http://localhost:3000';
}

async function sendEmailVerification(userId: string, email: string): Promise<void> {
  const token = await userService.generateEmailVerificationToken(userId);
  const verifyUrl = `${frontendUrl()}/#/verify-email?token=${token}`;
  await sendVerificationEmail(email, verifyUrl);
}

async function ensureActiveSubscription(userId: string, res: Response): Promise<boolean> {
  const accessStatus = await userService.getAccessStatus(userId);
  if (!accessStatus.allowed) {
    if (accessStatus.reason === 'EMAIL_NOT_VERIFIED') {
      res.status(403).json({ error: EMAIL_NOT_VERIFIED_MESSAGE, code: 'EMAIL_NOT_VERIFIED' });
    } else {
      res.status(402).json({ error: TRIAL_EXPIRED_MESSAGE, code: accessStatus.reason || 'TRIAL_EXPIRED' });
    }
    return false;
  }
  return true;
}

async function ensureProjectAccess(req: AuthenticatedRequest, res: Response): Promise<string | null> {
  const { projectId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }

  if (!(await ensureActiveSubscription(userId, res))) {
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

    try {
      await sendEmailVerification(user.id, user.email);
    } catch (emailError) {
      // Don't fail registration if the verification email couldn't be sent - the
      // user can request another one from the "resend verification" prompt.
      console.error('Error sending verification email:', emailError);
    }

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

router.post('/auth/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const user = await userService.verifyEmailToken(String(token));
    if (!user) {
      return res.status(400).json({ error: 'This verification link is invalid or has expired.' });
    }

    const authToken = signAuthToken({ userId: user.id, email: user.email });
    res.json({ token: authToken, user });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

router.post('/auth/resend-verification', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await userService.getUserById(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.emailVerified) {
      return res.json({ success: true, alreadyVerified: true });
    }

    await sendEmailVerification(user.id, user.email);
    res.json({ success: true });
  } catch (error: any) {
    if (error?.message?.includes('just sent')) {
      return res.status(429).json({ error: error.message });
    }

    console.error('Error resending verification email:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
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

router.post('/auth/google', async (req: Request, res: Response) => {
  try {
    if (!isGoogleSignInConfigured()) {
      return res.status(503).json({ error: 'Google sign-in is not configured on this server' });
    }

    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'idToken is required' });
    }

    const profile = await verifyGoogleIdToken(String(idToken));
    const user = await userService.findOrCreateGoogleUser(profile);
    const token = signAuthToken({ userId: user.id, email: user.email });

    res.json({ token, user });
  } catch (error: any) {
    console.error('Error authenticating with Google:', error);
    res.status(401).json({ error: error?.message || 'Google sign-in failed' });
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

router.post('/auth/api-key', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const apiKey = await userService.generateApiKey(req.user!.id);
    res.status(201).json({ apiKey });
  } catch (error) {
    console.error('Error generating API key:', error);
    res.status(500).json({ error: 'Failed to generate API key' });
  }
});

// Public pricing plan catalog
router.get('/billing/plans', async (req: Request, res: Response) => {
  res.json({ plans: PLANS, billingEnabled: isBillingConfigured() });
});

router.get('/billing/subscription', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const profile = await userService.getBillingProfile(req.user!.id);
    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    const accessStatus = await userService.getAccessStatus(req.user!.id);

    res.json({
      plan: getPlanById(profile.plan),
      subscriptionStatus: profile.subscriptionStatus,
      currentPeriodEnd: profile.currentPeriodEnd,
      hasBillingAccount: Boolean(profile.razorpaySubscriptionId),
      trialDaysLeft: accessStatus.trialDaysLeft,
      accessAllowed: accessStatus.allowed,
      emailVerified: accessStatus.emailVerified,
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

router.post('/billing/checkout', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isBillingConfigured()) {
      return res.status(503).json({ error: 'Billing is not configured on this server' });
    }

    const { planId, interval } = req.body;
    const plan = PLANS.find((p) => p.id === planId);
    const billingInterval: BillingInterval = interval === 'annual' ? 'annual' : 'monthly';

    if (!plan || !plan.planIdEnvVar || plan.comingSoon) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    const url = await createSubscriptionCheckout(req.user!.id, req.user!.email, plan.id as PlanId, billingInterval);

    res.json({ url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error?.message || 'Failed to start checkout' });
  }
});

router.post('/billing/cancel', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isBillingConfigured()) {
      return res.status(503).json({ error: 'Billing is not configured on this server' });
    }

    await cancelSubscription(req.user!.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    res.status(400).json({ error: error?.message || 'Failed to cancel subscription' });
  }
});

// Save test results
router.post('/tests/batch', async (req: Request, res: Response) => {
  try {
    const { results, projectId, projectName } = req.body;

    if (!Array.isArray(results)) {
      return res.status(400).json({ error: 'Results must be an array' });
    }

    let apiUser: { id: string; email: string } | null = null;
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

    if (token) {
      try {
        const payload = verifyAuthToken(token);
        apiUser = { id: payload.userId, email: payload.email };
      } catch {
        const user = await userService.verifyApiKey(token);
        if (!user) {
          return res.status(401).json({ error: 'Invalid API key or token' });
        }
        apiUser = { id: user.id, email: user.email };
      }
    }

    // An identified reporter (JWT or API key) is held to the same access rules as the
    // rest of the app - an unverified email or an expired trial blocks ingestion too,
    // not just viewing dashboards or clicking "New Project". Anonymous/unauthenticated
    // submissions (no apiUser) are intentionally left ungated, unchanged from before.
    if (apiUser && !(await ensureActiveSubscription(apiUser.id, res))) {
      return;
    }

    // Ensure project exists
    let project = null;
    if (projectId && validateUuid(projectId)) {
      project = await projectService.getProject(projectId);
      if (project && apiUser && project.userId && project.userId !== apiUser.id) {
        return res.status(403).json({ error: 'Project does not belong to the authenticated user' });
      }
    }

    if (!project) {
      project = await projectService.createProject(
        projectName || 'Unknown Project',
        'Auto-created from reporter upload',
        'unknown',
        apiUser?.id
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
        imagePath: result.imagePath,
        imageDataBase64: result.imageDataBase64,
        imageFileName: result.imageFileName,
        imageContentType: result.imageContentType,
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

// Get confidence score
router.get('/projects/:projectId/confidence-score', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = await ensureProjectAccess(req, res);
    if (!projectId) {
      return;
    }
    const { days = 30 } = req.query;

    const confidenceScore = await testService.getConfidenceScore(projectId, parseInt(days as string));
    res.json(confidenceScore);
  } catch (error) {
    console.error('Error fetching confidence score:', error);
    res.status(500).json({ error: 'Failed to fetch confidence score' });
  }
});

// Get guardrail status
router.get('/projects/:projectId/guardrails', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = await ensureProjectAccess(req, res);
    if (!projectId) {
      return;
    }
    const { days = 30 } = req.query;

    const project = await projectService.getProject(projectId, req.user!.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const guardrails = await testService.getGuardrails(
      projectId,
      {
        minPassRate: project.guardrailMinPassRate,
        maxFlakiness: project.guardrailMaxFlakiness,
        maxAvgDurationMs: project.guardrailMaxAvgDurationMs,
      },
      parseInt(days as string)
    );
    res.json(guardrails);
  } catch (error) {
    console.error('Error fetching guardrails:', error);
    res.status(500).json({ error: 'Failed to fetch guardrails' });
  }
});

// Get module-wise metrics
router.get('/projects/:projectId/module-metrics', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = await ensureProjectAccess(req, res);
    if (!projectId) {
      return;
    }
    const { days = 30 } = req.query;

    const moduleMetrics = await testService.getModuleMetrics(projectId, parseInt(days as string));
    res.json(moduleMetrics);
  } catch (error) {
    console.error('Error fetching module metrics:', error);
    res.status(500).json({ error: 'Failed to fetch module metrics' });
  }
});

// Get module x day pass-rate heatmap
router.get('/projects/:projectId/heatmap', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = await ensureProjectAccess(req, res);
    if (!projectId) {
      return;
    }
    const { days = 14 } = req.query;

    const heatmap = await testService.getModuleHeatmap(projectId, parseInt(days as string));
    res.json(heatmap);
  } catch (error) {
    console.error('Error fetching module heatmap:', error);
    res.status(500).json({ error: 'Failed to fetch module heatmap' });
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

// Serve stored trace zip for a test result (public endpoint for trace.playwright.dev)
router.get('/traces/:testResultId/download', async (req: Request, res: Response) => {
  try {
    const { testResultId } = req.params;
    const trace = await testService.getTraceFileByTestResultId(testResultId);

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

// Serve stored image artifact for a test result
router.get('/images/:testResultId/download', async (req: Request, res: Response) => {
  try {
    const { testResultId } = req.params;
    const image = await testService.getImageFileByTestResultId(testResultId);

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const buffer = Buffer.from(image.contentBase64, 'base64');

    res.setHeader('Content-Type', image.contentType || 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="${image.fileName}"`);
    res.setHeader('Content-Length', buffer.length.toString());
    res.setHeader('Cache-Control', 'public, max-age=31536000');

    res.send(buffer);
  } catch (error) {
    console.error('Error serving image file:', error);
    res.status(500).json({ error: 'Failed to serve image file' });
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

    if (!(await ensureActiveSubscription(req.user!.id, res))) {
      return;
    }

    const billingProfile = await userService.getBillingProfile(req.user!.id);
    const plan = getPlanById(billingProfile?.plan);

    if (plan.maxProjects !== null) {
      const existingProjects = await projectService.getAllProjects(req.user!.id);
      if (existingProjects.length >= plan.maxProjects) {
        return res.status(403).json({
          error: `Your ${plan.name} plan is limited to ${plan.maxProjects} project${plan.maxProjects === 1 ? '' : 's'}. Upgrade to add more.`,
          code: 'PLAN_LIMIT_REACHED',
        });
      }
    }

    const project = await projectService.createProject(
      name,
      description,
      owner || req.user?.email,
      req.user!.id
    );
    res.json(project);
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'A project with this name already exists in your profile' });
    }

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
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'A project with this name already exists in your profile' });
    }

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

// Seed (or refresh) a permanent, full-access test account - triggerable from a
// browser by visiting this URL directly, so it deliberately accepts GET as well
// as POST. Requires ADMIN_KEY to be set on the server (unlike /admin/migrate
// below, there is no hardcoded fallback key).
async function handleSeedTestAccount(req: Request, res: Response) {
  try {
    const adminKey = (req.method === 'GET' ? req.query.adminKey : req.body?.adminKey) as string | undefined;

    if (!process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const params = req.method === 'GET' ? req.query : req.body;
    const result = await seedTestAccount({
      email: params.email as string | undefined,
      password: params.password as string | undefined,
      resetPassword: params.resetPassword as string | undefined,
    });

    res.json({
      success: true,
      created: result.created,
      email: result.email,
      password: result.password || '(unchanged - add &resetPassword=<new-password> to change it)',
      plan: result.plan,
      note: result.password
        ? 'Save the password now - it is hashed in the database and cannot be recovered later.'
        : 'Password unchanged from last time.',
    });
  } catch (error) {
    console.error('Error seeding test account:', error);
    res.status(500).json({ error: 'Failed to seed test account' });
  }
}

router.get('/admin/seed-test-account', handleSeedTestAccount);
router.post('/admin/seed-test-account', handleSeedTestAccount);

// Seed (or re-seed) a realistic demo project - ~3 weeks of history across
// several modules/browsers, a deliberately flaky module, and a recent
// performance regression - under a given account (defaults to the test
// account). Also browser-triggerable, same ADMIN_KEY gate as above.
async function handleSeedDemoData(req: Request, res: Response) {
  try {
    const adminKey = (req.method === 'GET' ? req.query.adminKey : req.body?.adminKey) as string | undefined;

    if (!process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const params = req.method === 'GET' ? req.query : req.body;
    const email = ((params.email as string | undefined) || DEFAULT_TEST_ACCOUNT_EMAIL).toLowerCase();
    const projectName = params.projectName as string | undefined;

    const user = await userService.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: `No account found for ${email}. Seed the test account first.` });
    }

    const result = await seedDemoProject(user.id, user.email, projectName);

    res.json({
      success: true,
      email: user.email,
      projectId: result.projectId,
      projectName: result.projectName,
      testResultCount: result.testResultCount,
    });
  } catch (error) {
    console.error('Error seeding demo data:', error);
    res.status(500).json({ error: 'Failed to seed demo data' });
  }
}

router.get('/admin/seed-demo-data', handleSeedDemoData);
router.post('/admin/seed-demo-data', handleSeedDemoData);

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
