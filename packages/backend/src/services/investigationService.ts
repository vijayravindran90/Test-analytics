import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import testService from './testService';
import userService from './userService';
import { encrypt, decrypt, isEncryptionConfigured } from '../utils/encryption';

const SHARED_ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SHARED_ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
// OpenAI's model lineup moves fast and this default will go stale - override
// via OPENAI_MODEL if a user's configured OpenAI key stops working with it.
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const SHARED_KEY_DAILY_LIMIT = parseInt(process.env.AI_SHARED_KEY_DAILY_LIMIT || '5', 10);

export function isInvestigationConfigured(): boolean {
  return Boolean(SHARED_ANTHROPIC_API_KEY);
}

export type AiProvider = 'anthropic' | 'openai';

export interface TestInvestigation {
  testId: string;
  testName: string;
  rootCauseAnalysis: string;
  shortTermFix: string;
  longTermFix: string;
  codeLocation: string;
  suggestedSolution: string;
  codeFix: string;
  codeFixLanguage: string;
  modelUsed: string | null;
  updatedAt: Date;
}

export class SharedKeyLimitError extends Error {
  constructor(public limit: number) {
    super(`Daily limit of ${limit} AI investigations reached for the shared key. Add your own Anthropic or OpenAI key for unlimited use.`);
  }
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
    codeFix: row.code_fix || '',
    codeFixLanguage: row.code_fix_language || 'typescript',
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

// --- BYOK key management -----------------------------------------------

export async function saveUserAiKey(userId: string, provider: AiProvider, apiKey: string): Promise<{ provider: AiProvider; last4: string }> {
  if (!isEncryptionConfigured()) {
    throw new Error('Storing your own AI key is not configured on this server (missing ENCRYPTION_KEY)');
  }
  const trimmed = apiKey.trim();
  if (trimmed.length < 10) {
    throw new Error('That does not look like a valid API key');
  }
  const last4 = trimmed.slice(-4);
  const encrypted = encrypt(trimmed);
  await userService.setAiKey(userId, provider, encrypted, last4);
  return { provider, last4 };
}

export async function removeUserAiKey(userId: string): Promise<void> {
  await userService.removeAiKey(userId);
}

export async function getUserAiKeyStatus(userId: string): Promise<{ provider: AiProvider; last4: string } | null> {
  const key = await userService.getAiKey(userId);
  return key ? { provider: key.provider, last4: key.last4 } : null;
}

// --- Provider calls -------------------------------------------------------

async function callAnthropic(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model,
    max_tokens: 2500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });
  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('AI investigation did not return a text response');
  }
  return textBlock.text;
}

async function callOpenAi(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const openai = new OpenAI({ apiKey });
  const response = await openai.chat.completions.create({
    model,
    max_tokens: 2500,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });
  const text = response.choices[0]?.message?.content;
  if (!text) {
    throw new Error('AI investigation did not return a text response');
  }
  return text;
}

function parseInvestigationJson(text: string): Record<string, string> {
  let parsed: Record<string, string>;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch {
    throw new Error('Failed to parse the AI investigation response');
  }

  const required = ['rootCauseAnalysis', 'shortTermFix', 'longTermFix', 'codeLocation', 'suggestedSolution', 'codeFix'];
  for (const key of required) {
    if (typeof parsed[key] !== 'string' || !parsed[key].trim()) {
      throw new Error(`AI investigation response is missing "${key}"`);
    }
  }
  if (typeof parsed.codeFixLanguage !== 'string' || !parsed.codeFixLanguage.trim()) {
    parsed.codeFixLanguage = 'typescript';
  }
  return parsed;
}

// --- Prompt construction ----------------------------------------------------

const JSON_RESPONSE_INSTRUCTIONS = `Respond with ONLY a single JSON object, no markdown fences, no prose outside the JSON, with exactly these string keys: "rootCauseAnalysis", "shortTermFix", "longTermFix", "codeLocation", "suggestedSolution", "codeFix", "codeFixLanguage". Inside the "codeFix" string, use \\n for newlines and escape quotes properly so the value is valid JSON - do not wrap it in markdown code fences.`;

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
- codeFix must be a complete, ready-to-paste code snippet (not a diff, not a fragment with "..." gaps) that a developer can copy directly into their IDE - typically a corrected version of the test (using the inferred file path and title as context) showing the specific change (e.g. an explicit wait, a more resilient locator, a retry wrapper, an increased timeout). Include a one-line comment above the changed line(s) explaining why. Since you cannot see the real test source, base it on Playwright/TypeScript conventions and clearly-named placeholder locators/selectors consistent with the error message, and add a short comment at the top noting it's a representative fix to adapt to their actual test code, not a verbatim diff of it.
- codeFixLanguage is the language of the codeFix snippet, almost always "typescript" for a Playwright project unless the error evidence clearly indicates otherwise.

Keep rootCauseAnalysis, shortTermFix, longTermFix, codeLocation and suggestedSolution to 2-5 sentences each. Be specific to the evidence given, not generic testing advice.`;

// --- Main entry point --------------------------------------------------

export async function investigateTest(
  userId: string,
  projectId: string,
  testId: string,
  testName: string
): Promise<TestInvestigation> {
  const ownKey = await userService.getAiKey(userId);

  let provider: AiProvider;
  let apiKey: string;
  let model: string;

  if (ownKey) {
    provider = ownKey.provider;
    apiKey = decrypt(ownKey.encryptedKey);
    model = provider === 'anthropic' ? SHARED_ANTHROPIC_MODEL : OPENAI_MODEL;
  } else {
    if (!SHARED_ANTHROPIC_API_KEY) {
      throw new Error('AI investigation is not configured on this server');
    }
    const usedToday = await userService.getSharedAiKeyUsageToday(userId);
    if (usedToday >= SHARED_KEY_DAILY_LIMIT) {
      throw new SharedKeyLimitError(SHARED_KEY_DAILY_LIMIT);
    }
    provider = 'anthropic';
    apiKey = SHARED_ANTHROPIC_API_KEY;
    model = SHARED_ANTHROPIC_MODEL;
  }

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

  let rawText: string;
  try {
    rawText =
      provider === 'anthropic'
        ? await callAnthropic(apiKey, model, SYSTEM_PROMPT, prompt)
        : await callOpenAi(apiKey, model, SYSTEM_PROMPT, prompt);
  } catch (err: any) {
    if (ownKey && (err?.status === 401 || err?.status === 403)) {
      throw new Error(
        `Your saved ${provider === 'anthropic' ? 'Anthropic' : 'OpenAI'} key was rejected. Check it's correct in Integration settings.`
      );
    }
    if (ownKey && err?.status === 429) {
      throw new Error(`Your ${provider === 'anthropic' ? 'Anthropic' : 'OpenAI'} account has hit its own rate limit or quota.`);
    }
    throw new Error(`The AI provider request failed: ${err?.message || 'unknown error'}`);
  }

  const parsed = parseInvestigationJson(rawText);

  // Only charge against the daily cap once the call actually succeeded, so a
  // failed generation doesn't burn part of the user's free allowance.
  if (!ownKey) {
    await userService.incrementSharedAiKeyUsage(userId);
  }

  const id = uuidv4();
  await pool.query(
    `INSERT INTO test_investigations
     (id, project_id, test_id, test_name, root_cause_analysis, short_term_fix, long_term_fix, code_location, suggested_solution, code_fix, code_fix_language, model_used, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, CURRENT_TIMESTAMP)
     ON CONFLICT (project_id, test_id) DO UPDATE SET
       test_name = $4, root_cause_analysis = $5, short_term_fix = $6, long_term_fix = $7,
       code_location = $8, suggested_solution = $9, code_fix = $10, code_fix_language = $11,
       model_used = $12, updated_at = CURRENT_TIMESTAMP`,
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
      parsed.codeFix,
      parsed.codeFixLanguage,
      `${provider}:${model}`,
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
    codeFix: parsed.codeFix,
    codeFixLanguage: parsed.codeFixLanguage,
    modelUsed: `${provider}:${model}`,
    updatedAt: new Date(),
  };
}
