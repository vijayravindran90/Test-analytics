import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, BarChart3, GitBranch, ShieldCheck, Zap } from 'lucide-react';
import PricingPlans from '../components/PricingPlans';

const FEATURES = [
  {
    icon: BarChart3,
    title: 'Test analytics dashboard',
    description: 'Pass rate, failure rate, flakiness and stability metrics for every project, updated as results come in.',
    color: 'text-primary-600 bg-primary-50',
  },
  {
    icon: AlertTriangle,
    title: 'Flaky test detection',
    description: 'Automatically surface tests that pass and fail across runs, with trend analysis so you know what to fix first.',
    color: 'text-warning-600 bg-warning-50',
  },
  {
    icon: Activity,
    title: 'Performance alerts',
    description: 'Get notified the moment a test regresses past your duration threshold, before it slows down your whole suite.',
    color: 'text-danger-600 bg-danger-50',
  },
  {
    icon: GitBranch,
    title: 'Browser & CI breakdowns',
    description: 'Slice results by browser, build, branch and commit to pinpoint exactly where a regression was introduced.',
    color: 'text-primary-600 bg-primary-50',
  },
  {
    icon: Zap,
    title: 'Drop-in Playwright reporter',
    description: 'Add one reporter entry to your Playwright config and results start streaming to your dashboard automatically.',
    color: 'text-success-600 bg-success-50',
  },
  {
    icon: ShieldCheck,
    title: 'Private by default',
    description: 'Every account is isolated. Your projects, test results and traces are never visible to other users.',
    color: 'text-success-600 bg-success-50',
  },
];

export default function Landing() {
  return (
    <div className="space-y-24 pb-12">
      <section className="relative overflow-hidden text-center pt-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-[32rem] w-[64rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-primary-200 via-success-100 to-transparent opacity-60 blur-3xl"
        />
        <span className="badge badge-success mx-auto inline-flex">Now in public beta</span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
          Ship reliable Playwright suites with{' '}
          <span className="gradient-text">analytics built for test stability</span>
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
            <div
              key={feature.title}
              className="card p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.color}`}>
                <feature.icon className="h-6 w-6" />
              </div>
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

      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 p-10 text-center text-white shadow-xl">
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-2xl"
        />
        <h2 className="text-3xl font-bold">Ready to see your test suite clearly?</h2>
        <p className="mx-auto mt-3 max-w-xl text-primary-100">
          Pick a plan and sign in with Google or your email to spin up your first project in minutes.
        </p>
        <Link
          to="/pricing"
          className="btn mt-6 inline-flex bg-white px-6 py-3 text-base text-primary-700 shadow-lg hover:bg-primary-50"
        >
          Choose a plan to get started
        </Link>
      </section>
    </div>
  );
}
