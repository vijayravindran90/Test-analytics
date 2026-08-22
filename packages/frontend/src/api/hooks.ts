import { useState, useEffect } from 'react';
import apiClient from './client';
import type { DashboardData, TestMetrics, FlakyTest, PerformanceAlert, Project } from 'test-analytics-shared';

export function useDashboardData(projectId: string, days: number = 30) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/projects/${projectId}/dashboard?days=${days}`);
        setData(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, days]);

  return { data, loading, error };
}

export function useMetrics(projectId: string, days: number = 30) {
  const [metrics, setMetrics] = useState<TestMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/projects/${projectId}/metrics?days=${days}`);
        setMetrics(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [projectId, days]);

  return { metrics, loading, error };
}

export function useFlakyTests(projectId: string) {
  const [tests, setTests] = useState<FlakyTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/projects/${projectId}/flaky-tests`);
        setTests(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch flaky tests');
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, [projectId]);

  return { tests, loading, error };
}

export function usePerformanceAlerts(projectId: string) {
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/projects/${projectId}/performance-alerts`);
        setAlerts(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch performance alerts');
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, [projectId]);

  return { alerts, loading, error };
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/projects');
        setProjects(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch projects');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  return { projects, loading, error };
}

export function useProject(projectId: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/projects/${projectId}`);
        setProject(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch project');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  return { project, loading, error };
}

export async function updateProject(projectId: string, updates: Record<string, unknown>) {
  const response = await apiClient.put(`/projects/${projectId}`, updates);
  return response.data;
}

export function useBrowserMetrics(projectId: string) {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/projects/${projectId}/browser-metrics`);
        setMetrics(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch browser metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [projectId]);

  return { metrics, loading, error };
}

export function useBrowserTrends(projectId: string, days: number = 30) {
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/projects/${projectId}/browser-trends?days=${days}`);
        setTrends(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch browser trends');
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, [projectId, days]);

  return { trends, loading, error };
}

export function useTestRuns(projectId: string, limit: number = 20) {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRuns = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/projects/${projectId}/test-runs?limit=${limit}`);
        setRuns(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch test runs');
      } finally {
        setLoading(false);
      }
    };

    fetchRuns();
  }, [projectId, limit]);

  return { runs, loading, error };
}

export interface SubscriptionInfo {
  plan: { id: string; name: string; priceMonthly: number };
  subscriptionStatus?: string;
  currentPeriodEnd?: string;
  hasBillingAccount: boolean;
  trialDaysLeft: number | null;
  accessAllowed: boolean;
  emailVerified: boolean;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/billing/subscription');
        setSubscription(response.data);
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Unable to load your subscription');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  return { subscription, loading, error };
}

export interface ConfidenceScore {
  score: number;
  label: 'Excellent' | 'Good' | 'Needs attention' | 'At risk';
  breakdown: {
    passRateScore: number;
    stabilityScore: number;
    recencyScore: number;
  };
  lastRunAt: string | null;
}

export function useConfidenceScore(projectId: string, days: number = 30) {
  const [score, setScore] = useState<ConfidenceScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScore = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/projects/${projectId}/confidence-score?days=${days}`);
        setScore(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch confidence score');
      } finally {
        setLoading(false);
      }
    };

    fetchScore();
  }, [projectId, days]);

  return { score, loading, error };
}

export interface GuardrailCheck {
  key: string;
  label: string;
  status: 'pass' | 'fail';
  actual: number;
  threshold: number;
  unit: '%' | 'ms';
}

export interface Guardrails {
  overallStatus: 'pass' | 'fail';
  checks: GuardrailCheck[];
}

export function useGuardrails(projectId: string, days: number = 30) {
  const [guardrails, setGuardrails] = useState<Guardrails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGuardrails = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/projects/${projectId}/guardrails?days=${days}`);
        setGuardrails(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch guardrails');
      } finally {
        setLoading(false);
      }
    };

    fetchGuardrails();
  }, [projectId, days]);

  return { guardrails, loading, error };
}

export interface ModuleMetric {
  module: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: number;
  flakinessPercentage: number;
  avgDuration: number;
}

export function useModuleMetrics(projectId: string, days: number = 30) {
  const [modules, setModules] = useState<ModuleMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModules = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/projects/${projectId}/module-metrics?days=${days}`);
        setModules(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch module metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchModules();
  }, [projectId, days]);

  return { modules, loading, error };
}

export interface HeatmapCell {
  module: string;
  date: string;
  totalTests: number;
  passedTests: number;
  passRate: number;
}

export interface Heatmap {
  modules: string[];
  dates: string[];
  cells: HeatmapCell[];
}

export function useModuleHeatmap(projectId: string, days: number = 14) {
  const [heatmap, setHeatmap] = useState<Heatmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHeatmap = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/projects/${projectId}/heatmap?days=${days}`);
        setHeatmap(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch heatmap');
      } finally {
        setLoading(false);
      }
    };

    fetchHeatmap();
  }, [projectId, days]);

  return { heatmap, loading, error };
}

export function useTestRunDetails(projectId: string, runId: string | null) {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) return;

    const fetchTests = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/projects/${projectId}/test-runs/${encodeURIComponent(runId)}/tests`);
        setTests(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch test run details');
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, [projectId, runId]);

  return { tests, loading, error };
}

