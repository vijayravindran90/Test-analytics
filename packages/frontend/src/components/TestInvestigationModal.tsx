import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, X } from 'lucide-react';
import apiClient from '../api/client';

interface TestInvestigationModalProps {
  projectId: string;
  testId: string;
  testName: string;
  onClose: () => void;
}

interface Investigation {
  rootCauseAnalysis: string;
  shortTermFix: string;
  longTermFix: string;
  codeLocation: string;
  suggestedSolution: string;
  cached: boolean;
  updatedAt: string;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{title}</h3>
      <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-800">{children}</p>
    </div>
  );
}

export default function TestInvestigationModal({ projectId, testId, testName, onClose }: TestInvestigationModalProps) {
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsUpgrade, setNeedsUpgrade] = useState(false);
  const [dailyLimitReached, setDailyLimitReached] = useState(false);

  const runInvestigation = async (forceRefresh: boolean) => {
    setLoading(true);
    setError(null);
    setNeedsUpgrade(false);
    setDailyLimitReached(false);
    try {
      const response = await apiClient.post(`/projects/${projectId}/tests/investigate`, {
        testId,
        testName,
        forceRefresh,
      });
      setInvestigation(response.data);
    } catch (err: any) {
      if (err?.response?.data?.code === 'PRO_REQUIRED') {
        setNeedsUpgrade(true);
      } else if (err?.response?.data?.code === 'AI_DAILY_LIMIT_REACHED') {
        setDailyLimitReached(true);
      } else {
        setError(err?.response?.data?.error || 'Unable to investigate this test right now.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runInvestigation(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary-600" />
              <h2 className="text-xl font-semibold">AI Investigation</h2>
            </div>
            <p className="mt-1 text-sm text-neutral-500">{testName}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6">
          {loading && <p className="text-sm text-neutral-600">Investigating this test...</p>}

          {needsUpgrade && (
            <div className="rounded-xl border border-primary-200 bg-primary-50 p-4 text-sm text-primary-800">
              AI investigation is a Pro plan feature. <Link to="/billing" className="font-semibold underline">Upgrade to Pro</Link> to
              get root cause analysis, fix suggestions, and code-location hints for your flaky tests.
            </div>
          )}

          {dailyLimitReached && (
            <div className="rounded-xl border border-warning-200 bg-warning-50 p-4 text-sm text-warning-800">
              You've reached today's limit on the shared AI key. Add your own Anthropic or OpenAI key in{' '}
              <Link to="/integration" className="font-semibold underline">Integration settings</Link> for unlimited investigations,
              or try again tomorrow.
            </div>
          )}

          {error && <div className="rounded-xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">{error}</div>}

          {investigation && !loading && (
            <div className="space-y-5">
              <p className="text-xs text-neutral-500">
                {investigation.cached ? 'Cached result from ' : 'Generated '}
                {new Date(investigation.updatedAt).toLocaleString()}
              </p>
              <Section title="Root cause analysis">{investigation.rootCauseAnalysis}</Section>
              <Section title="Short-term fix">{investigation.shortTermFix}</Section>
              <Section title="Long-term fix">{investigation.longTermFix}</Section>
              <Section title="Where to look in the code">{investigation.codeLocation}</Section>
              <Section title="Suggested solution">{investigation.suggestedSolution}</Section>

              <p className="text-xs italic text-neutral-500">
                This is inferred from the test's file path and Playwright's captured error messages, not a review of your
                application's actual source code.
              </p>

              <button
                type="button"
                onClick={() => runInvestigation(true)}
                className="btn btn-secondary"
              >
                Re-investigate
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
