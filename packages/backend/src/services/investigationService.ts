import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import testService from './testService';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-5';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('AI investigation is not configured on this server (missing ANTHROPIC_API_KEY)');
  }
  if (!client) {
    client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  }
  return client;
}

export function isInvestigationConfigured(): boolean {
  return Boolean(ANTHROPIC_API_KEY);
}

export interface TestInvestigation {
  testId: string;
  testName: string;
  rootCauseAnalysis: string;
  shortTermFix: string;
  longTermFix: string;
  codeLocation: string;
  suggestedSolution: string;
  modelUsed: string | null;
  updatedAt: Date;
}

function mapRow(row: any): TestInvestigation {
  return {
    testId: row.test_id,
    testName: row.test_name,
    rootCauseAnalysis: row.root_cause_analysis,
    shortTermFix: row.short_term_fix,
    longTermFix: row.long_term_fix,
    codeLocation: row.code_location,
    suggestedSolution: row.suggested_solution,
    modelUsed: row.model_used,
    updatedAt: row.updated_at,
  };
}

export async function getCachedInvestigation(projectId: string, testId: string): Promise<TestInvestigation | null> {
  const result = await pool.query(
    `SELECT * FROM test_investigations WHERE project_id = $1 AND test_id = $2`,
    [projectId, testId]
  );
  return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
}

const JSON_RESPONSE_INSTRUCTIONS = `Respond with ONLY a single JSON object, no markdown fences, no prose outside the JSON, with exactly these string keys: "rootCauseAnalysis", "shortTermFix", "longTermFix", "codeLocation", "suggestedSolution".`;

function buildPrompt(params: {
  testId: string;
  testName: string;
  flakiness?: { flakinessPercentage: number; totalRuns: number; passedRuns: number; failedRuns: number; trend: string };
  failures: { error?: string; browser?: string; os?: string; startTime?: Date; duration?: number; retries?: number }[];
}): string {
  const { testId, testName, flakiness, failures } = params;
  const [filePath] = testId.split('::');

  const failureBlocks = failures
    .map((f, i) => {
      return [
        `Failure ${i + 1} (${f.startTime ? new Date(f.startTime).toISOString() : 'unknown time'}):`,
        `  Browser/OS: ${f.browser || 'unknown'} / ${f.os || 'unknown'}`,
        `  Duration: ${f.duration ?? 'unknown'}ms, retries: ${f.retries ?? 0}`,
        `  Error message:\n${(f.error || '(no error message captured)').slice(0, 2000)}`,
      ].join('\n');
    })
    .join('\n\n');

  return `Test identifier: ${testId}
Test file (inferred): ${filePath}
Test title: ${testName}
${
  flakiness
    ? `Flakiness: ${flakiness.flakinessPercentage.toFixed(1)}% (${flakiness.failedRuns} failed / ${flakiness.totalRuns} total runs), trend: ${flakiness.trend}`
    : 'No historical flakiness record for this test.'
}

Recent failure evidence (most recent first):
${failureBlocks || '(no captured error messages available)'}

${JSON_RESPONSE_INSTRUCTIONS}`;
}

const SYSTEM_PROMPT = `You are a senior test engineering assistant helping a team diagnose a failing or flaky Playwright test.

Important constraint: you do NOT have access to the team's application source code or their test source code - only the test's identifier (file path + title, inferred from Playwright's reporter convention "<file>::<title>"), the raw error message(s) captured by Playwright from recent failures, and aggregate flakiness statistics already computed by the dashboard. Do not claim certainty you don't have.

Ground your analysis in what the evidence actually shows:
- If the error message contains a stack trace or code frame with an explicit file:line reference, cite that exact location in codeLocation and say it comes directly from the error.
- Otherwise, codeLocation should name the test file path (already given to you) as the most likely place to start, and explicitly say the exact line is inferred, not confirmed, since you cannot read the repository.
- rootCauseAnalysis should explain what class of failure this looks like (timeout waiting for an element, assertion mismatch, network/API flakiness, race condition, environment/browser-specific issue, etc.) and cite specific evidence from the error text or flakiness pattern that supports that read.
- shortTermFix should be something the team can do today without a large refactor (e.g. add an explicit wait, increase a timeout, retry a flaky network call, quarantine the test).
- longTermFix should address the underlying cause (e.g. fix a race condition in the app, stabilize a selector, remove a hidden dependency on timing/order).
- suggestedSolution should be concrete and actionable - a code-level suggestion (e.g. a Playwright API to use, a locator strategy, a wait condition) rather than generic advice like "investigate further".

Keep each field to 2-5 sentences. Be specific to the evidence given, not generic testing advice.`;

export async function investigateTest(
  projectId: string,
  testId: string,
  testName: string
): Promise<TestInvestigation> {
  const anthropic = getClient();

  const [flakyRows, failures] = await Promise.all([
    pool.query(
      `SELECT flakiness_percentage, total_runs, passed_runs, failed_runs, trend FROM flaky_tests WHERE project_id = $1 AND test_id = $2`,
      [projectId, testId]
    ),
    testService.getTestFailureHistory(projectId, testId, 5),
  ]);

  const flaky = flakyRows.rows[0];
  const flakiness = flaky
    ? {
        flakinessPercentage: parseFloat(flaky.flakiness_percentage),
        totalRuns: flaky.total_runs,
        passedRuns: flaky.passed_runs,
        failedRuns: flaky.failed_runs,
        trend: flaky.trend,
      }
    : undefined;

  const prompt = buildPrompt({ testId, testName, flakiness, failures });

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('AI investigation did not return a text response');
  }

  let parsed: Record<string, string>;
  try {
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : textBlock.text);
  } catch {
    throw new Error('Failed to parse the AI investigation response');
  }

  const required = ['rootCauseAnalysis', 'shortTermFix', 'longTermFix', 'codeLocation', 'suggestedSolution'];
  for (const key of required) {
    if (typeof parsed[key] !== 'string' || !parsed[key].trim()) {
      throw new Error(`AI investigation response is missing "${key}"`);
    }
  }

  const id = uuidv4();
  await pool.query(
    `INSERT INTO test_investigations
     (id, project_id, test_id, test_name, root_cause_analysis, short_term_fix, long_term_fix, code_location, suggested_solution, model_used, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, CURRENT_TIMESTAMP)
     ON CONFLICT (project_id, test_id) DO UPDATE SET
       test_name = $4, root_cause_analysis = $5, short_term_fix = $6, long_term_fix = $7,
       code_location = $8, suggested_solution = $9, model_used = $10, updated_at = CURRENT_TIMESTAMP`,
    [
      id,
      projectId,
      testId,
      testName,
      parsed.rootCauseAnalysis,
      parsed.shortTermFix,
      parsed.longTermFix,
      parsed.codeLocation,
      parsed.suggestedSolution,
      MODEL,
    ]
  );

  return {
    testId,
    testName,
    rootCauseAnalysis: parsed.rootCauseAnalysis,
    shortTermFix: parsed.shortTermFix,
    longTermFix: parsed.longTermFix,
    codeLocation: parsed.codeLocation,
    suggestedSolution: parsed.suggestedSolution,
    modelUsed: MODEL,
    updatedAt: new Date(),
  };
}
