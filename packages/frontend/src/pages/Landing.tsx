import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, BarChart3, GitBranch, ShieldCheck, Zap } from 'lucide-react';
import PricingPlans from '../components/PricingPlans';

const FEATURES = [
  {
    icon: BarChart3,
    title: 'Test analytics dashboard',
    description: 'Pass rate, failure rate, flakiness and stability metrics for every project, updated as results come in.',
  },
  {
    icon: AlertTriangle,
    title: 'Flaky test detection',
    description: 'Automatically surface tests that pass and fail across runs, with trend analysis so you know what to fix first.',
  },
  {
    icon: Activity,
    title: 'Performance alerts',
    description: 'Get notified the moment a test regresses past your duration threshold, before it slows down your whole suite.',
  },
  {
    icon: GitBranch,
    title: 'Browser & CI breakdowns',
    description: 'Slice results by browser, build, branch and commit to pinpoint exactly where a regression was introduced.',
  },
  {
    icon: Zap,
    title: 'Drop-in Playwright reporter',
    description: 'Add one reporter entry to your Playwright config and results start streaming to your dashboard automatically.',
  },
  {
    icon: ShieldCheck,
    title: 'Private by default',
    description: 'Every account is isolated. Your projects, test results and traces are never visible to other users.',
  },
];

export default function Landing() {
  return (
    <div className="space-y-24 pb-12">
      <section className="text-center pt-8">
        <span className="badge badge-success mx-auto inline-flex">Now in public beta</span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
          Ship reliable Playwright suites with analytics built for test stability
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-600">
          Test Analytics tracks pass rate, duration and flakiness across every run so your team can catch
          regressions and flaky tests before they slow down CI.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/pricing" className="btn btn-primary px-6 py-3 text-base">
            Start your free trial
          </Link>
          <Link to="/pricing" className="btn btn-secondary px-6 py-3 text-base">
            View pricing
          </Link>
        </div>
        <p className="mt-4 text-sm text-neutral-500">14-day free trial. No credit card required.</p>
      </section>

      <section>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold">Everything you need to trust your test suite</h2>
          <p className="mt-3 text-neutral-600">
            Built for teams running Playwright in CI who need visibility into what's actually happening across runs.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="card p-6">
              <feature.icon className="h-8 w-8 text-primary-500" />
              <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-neutral-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold">Simple, transparent pricing</h2>
          <p className="mt-3 text-neutral-600">Start free. Upgrade when your team needs more projects and history.</p>
        </div>

        <div className="mt-10">
          <PricingPlans />
        </div>
      </section>

      <section className="card p-10 text-center">
        <h2 className="text-3xl font-bold">Ready to see your test suite clearly?</h2>
        <p className="mx-auto mt-3 max-w-xl text-neutral-600">
          Pick a plan and sign in with Google or your email to spin up your first project in minutes.
        </p>
        <Link to="/pricing" className="btn btn-primary mt-6 inline-flex px-6 py-3 text-base">
          Choose a plan to get started
        </Link>
      </section>
    </div>
  );
}
