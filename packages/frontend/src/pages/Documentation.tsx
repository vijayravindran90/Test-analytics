import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Download,
  GitBranch,
  Grid3x3,
  KeyRound,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

const SECTIONS = [
  { id: 'getting-started', label: 'Getting started' },
  { id: 'reporter', label: 'Connect your tests' },
  { id: 'dashboard', label: 'Dashboard features' },
  { id: 'slack', label: 'Slack integration' },
  { id: 'plans', label: 'Plans & billing' },
];

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="mt-3 overflow-auto rounded-xl bg-neutral-100 p-4">
      <pre className="whitespace-pre-wrap text-sm text-neutral-900">{children}</pre>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-6">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-3 text-lg font-semibold">{title}</h3>
      <div className="mt-2 space-y-2 text-sm text-neutral-600">{children}</div>
    </div>
  );
}

export default function Documentation() {
  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <aside className="hidden lg:block">
        <nav className="sticky top-8 space-y-1 text-sm">
          <p className="mb-2 font-semibold text-neutral-900">On this page</p>
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="block rounded-lg px-3 py-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            >
              {section.label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="space-y-16">
        <div>
          <h1 className="text-3xl font-bold">Documentation</h1>
          <p className="mt-2 text-neutral-600">
            Everything you need to connect your Playwright suite, understand what the dashboard is telling you, and get
            alerts where your team already works.
          </p>
        </div>

        <section id="getting-started" className="scroll-mt-8">
          <h2 className="text-2xl font-bold">Getting started</h2>
          <div className="mt-4 space-y-4">
            <div className="card p-6">
              <ol className="list-inside list-decimal space-y-3 text-neutral-700">
                <li>
                  Go to <Link to="/pricing" className="text-primary-600 hover:underline">Pricing</Link> and choose a plan.
                  Free starts a 14-day trial with no credit card required.
                </li>
                <li>Sign in with Google, or register with your email (you'll need to verify it before creating projects).</li>
                <li>
                  Create a project from <Link to="/projects" className="text-primary-600 hover:underline">Projects</Link>{' '}
                  — this is where your test results and dashboards live.
                </li>
                <li>
                  Generate an API key from your profile menu (top right), then wire up the reporter — see{' '}
                  <a href="#reporter" className="text-primary-600 hover:underline">Connect your tests</a> below.
                </li>
                <li>Run your Playwright suite. Results appear on the dashboard within seconds of the run finishing.</li>
              </ol>
            </div>
          </div>
        </section>

        <section id="reporter" className="scroll-mt-8">
          <h2 className="text-2xl font-bold">Connect your tests</h2>
          <p className="mt-2 text-neutral-600">
            <code className="rounded bg-neutral-100 px-1.5 py-0.5">test-analytics-reporter</code> is a Playwright reporter
            that streams results to your dashboard as your suite runs — no separate upload step.
          </p>

          <div className="mt-4 card p-6">
            <h3 className="text-lg font-semibold">1. Install it</h3>
            <CodeBlock>{`npm install test-analytics-reporter`}</CodeBlock>
          </div>

          <div className="mt-4 card p-6">
            <h3 className="text-lg font-semibold">2. Get an API key</h3>
            <p className="mt-2 text-neutral-600">
              Open your profile menu (top right, once signed in) and choose <strong>Add API key</strong>. It's shown once
              — copy it into your environment (e.g. as <code className="rounded bg-neutral-100 px-1.5 py-0.5">API_KEY</code>{' '}
              in a <code className="rounded bg-neutral-100 px-1.5 py-0.5">.env</code> file, or as a secret in your CI
              provider).
            </p>
          </div>

          <div className="mt-4 card p-6">
            <h3 className="text-lg font-semibold">3. Add it to your Playwright config</h3>
            <CodeBlock>{`import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['html'],
    [
      'test-analytics-reporter',
      {
        backendUrl: 'https://<your-backend-url>/api',
        projectId: '<your-project-id>',      // from the project's URL
        projectName: '<your-project-name>',
        apiKey: process.env.API_KEY,
        enabled: true,
      },
    ],
  ],
  use: {
    // Optional but recommended: lets failed tests link to a trace viewer
    // and attach a screenshot on the dashboard.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});`}</CodeBlock>
            <p className="mt-3 text-sm text-neutral-600">
              Find <code className="rounded bg-neutral-100 px-1.5 py-0.5">projectId</code> in your project's URL:{' '}
              <code className="rounded bg-neutral-100 px-1.5 py-0.5">/#/project/&lt;projectId&gt;</code>. If you omit it,
              the reporter auto-creates a project from <code className="rounded bg-neutral-100 px-1.5 py-0.5">projectName</code>{' '}
              on first run.
            </p>
          </div>

          <div className="mt-4 card p-6">
            <h3 className="text-lg font-semibold">4. Run your tests</h3>
            <CodeBlock>{`npx playwright test`}</CodeBlock>
            <p className="mt-3 text-neutral-600">That's it — results stream to your dashboard as the run progresses.</p>
          </div>

          <div className="mt-4 card p-6">
            <h3 className="text-lg font-semibold">CI/CD build metadata (optional)</h3>
            <p className="mt-2 text-neutral-600">
              The reporter automatically picks up these environment variables, if set, to tag each run with its branch,
              commit and author — used for the module heatmap, test folder breakdown, and test-run history:
            </p>
            <CodeBlock>{`CI_BUILD_ID=build-123
CI_COMMIT_SHA=abc123def
CI_COMMIT_BRANCH=main
CI_COMMIT_AUTHOR=jane.doe

# Auto-detected on GitHub Actions, no setup needed:
GITHUB_RUN_ID
GITHUB_SHA
GITHUB_REF_NAME
GITHUB_ACTOR`}</CodeBlock>
          </div>
        </section>

        <section id="dashboard" className="scroll-mt-8">
          <h2 className="text-2xl font-bold">Dashboard features</h2>
          <p className="mt-2 text-neutral-600">What each part of the project dashboard is showing you.</p>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <FeatureCard icon={Sparkles} title="Confidence score">
              <p>
                A single 0–100 score answering "can I trust this suite right now?" — weighted 50% pass rate, 30%
                stability (100 − flakiness), and 20% how recently tests actually ran. A suite that's healthy but hasn't
                run in a week scores lower than one that ran an hour ago.
              </p>
            </FeatureCard>

            <FeatureCard icon={ShieldCheck} title="Guardrails">
              <p>
                Pass/fail chips against per-project quality gates: minimum pass rate (default 90%), maximum flakiness
                (default 15%), and an optional maximum average duration. A breach shows as a red chip with the actual
                value vs. the threshold, so you know exactly what to fix.
              </p>
            </FeatureCard>

            <FeatureCard icon={AlertTriangle} title="Flaky test detection">
              <p>
                Tests that pass and fail across runs are tracked automatically — no configuration needed. Each one shows
                its flakiness %, total runs, and a trend (improving / degrading / stable) based on recent vs. historical
                behavior.
              </p>
            </FeatureCard>

            <FeatureCard icon={Activity} title="Performance alerts">
              <p>
                When a test's duration exceeds a threshold (or jumps sharply vs. its previous run), it's flagged here
                with the current vs. previous duration and the percentage increase — so a slow test doesn't quietly
                creep up on you.
              </p>
            </FeatureCard>

            <FeatureCard icon={Grid3x3} title="Module heatmap">
              <p>
                Pass rate by test folder × day, color-coded from red (failing) to green (healthy). Derived automatically
                from your test file paths — no extra tagging required. Hover any cell for the exact numbers.
              </p>
            </FeatureCard>

            <FeatureCard icon={BarChart3} title="Test folder metrics">
              <p>
                The heatmap's data as a sortable table: tests, pass rate, flakiness and average duration rolled up per
                folder — useful for spotting which part of the suite needs attention at a glance.
              </p>
            </FeatureCard>

            <FeatureCard icon={TrendingUp} title="Trend charts">
              <p>
                Pass rate, flakiness, and duration over time, plus a stacked overview of pass/fail/flaky rate per day.
                Switch the date range (7/30/90 days) from the dashboard header.
              </p>
            </FeatureCard>

            <FeatureCard icon={GitBranch} title="Test runs & browser breakdown">
              <p>
                Results grouped by CI build (or, without one, by run time) with expandable per-test detail, plus a
                separate view sliced by browser (Chromium/Firefox/WebKit) so you can catch a browser-specific
                regression.
              </p>
            </FeatureCard>
          </div>

          <div className="mt-6 card p-6">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              <Download className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-lg font-semibold">Exporting reports</h3>
            <p className="mt-2 text-neutral-600">
              The <strong>Download</strong> menu on any project dashboard exports the current view (metrics, recent
              tests, flaky tests, alerts, and test runs) as HTML, CSV, JSON, or PDF — handy for sharing a snapshot
              outside the dashboard.
            </p>
          </div>
        </section>

        <section id="slack" className="scroll-mt-8">
          <h2 className="text-2xl font-bold">Slack integration</h2>
          <p className="mt-2 text-neutral-600">Get performance alerts posted directly to a Slack channel.</p>

          <div className="mt-4 card p-6">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-lg font-semibold">Setup</h3>
            <ol className="mt-3 list-inside list-decimal space-y-2 text-neutral-700">
              <li>
                In Slack, create an{' '}
                <a
                  href="https://api.slack.com/messaging/webhooks"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary-600 hover:underline"
                >
                  Incoming Webhook
                </a>{' '}
                for the channel you want alerts in, and copy its URL.
              </li>
              <li>Open your project's dashboard and click <strong>Integration</strong> in the top bar.</li>
              <li>Paste the webhook URL into the Slack Integration field and save.</li>
            </ol>
            <p className="mt-3 text-neutral-600">
              From then on, whenever a test's duration regresses past its threshold, your channel gets a message with
              the test name, current vs. previous duration, percentage increase, and a summary chart of the run's
              pass/fail/flaky/skipped breakdown.
            </p>
          </div>
        </section>

        <section id="plans" className="scroll-mt-8">
          <h2 className="text-2xl font-bold">Plans & billing</h2>
          <div className="mt-4 card p-6">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              <KeyRound className="h-5 w-5" />
            </div>
            <p className="mt-3 text-neutral-600">
              Free starts a 14-day trial (1 project). Pro is $12/month billed monthly, or $10/month billed annually, and
              raises the project limit and history window. See{' '}
              <Link to="/pricing" className="text-primary-600 hover:underline">Pricing</Link> for the full comparison, or{' '}
              <Link to="/billing" className="text-primary-600 hover:underline">Billing</Link> (from your profile menu) to
              change plans or manage an existing subscription.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
