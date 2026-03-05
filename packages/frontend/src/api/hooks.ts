import { useState, useEffect } from 'react';
import apiClient from './client';
import type { DashboardData, TestMetrics, FlakyTest, PerformanceAlert, Project } from '@test-analytics/shared';

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
