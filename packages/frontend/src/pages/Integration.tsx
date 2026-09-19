import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';

type AiProvider = 'anthropic' | 'openai';

function AiKeyCard() {
  const [status, setStatus] = useState<{ provider: AiProvider | null; last4: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<AiProvider>('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const response = await apiClient.get('/auth/ai-key');
      setStatus(response.data);
    } catch {
      setStatus({ provider: null, last4: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiClient.post('/auth/ai-key', { provider, apiKey });
      setApiKey('');
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Unable to save that key');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiClient.delete('/auth/ai-key');
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Unable to remove your key');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-6 border border-neutral-200 bg-white shadow-sm">
      <h2 className="text-xl font-semibold">AI investigation key (optional)</h2>
      <p className="mt-3 text-neutral-600">
        "Investigate" on a flaky test uses our shared key by default, capped at a few investigations per day. Add your own
        Anthropic or OpenAI key for unlimited use, billed to your own account instead.
      </p>

      {!loading && status?.provider && (
        <div className="mt-6 flex items-center justify-between rounded-xl border border-success-200 bg-success-50 p-4 text-sm text-success-800">
          <span>
            Using your <strong>{status.provider === 'anthropic' ? 'Anthropic' : 'OpenAI'}</strong> key ending in{' '}
            <strong>{status.last4}</strong>
          </span>
          <button type="button" onClick={handleRemove} disabled={saving} className="btn btn-secondary">
            Remove
          </button>
        </div>
      )}

      {!loading && !status?.provider && (
        <form onSubmit={handleSave} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as AiProvider)}
              className="w-full rounded-lg border px-4 py-2"
            >
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">API key</label>
            <input
              type="password"
              required
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
              className="w-full rounded-lg border px-4 py-2"
            />
          </div>
          {error && <p className="text-sm text-danger-600">{error}</p>}
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? 'Saving...' : 'Save key'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function Integration() {
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Integration</h1>
            <p className="mt-2 text-neutral-600">
              Use the Test Analytics reporter to send Playwright results directly to your dashboard.
            </p>
          </div>
          <Link to="/projects" className="btn btn-secondary">
            Back to projects
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6 border border-neutral-200 bg-white shadow-sm">
          <h2 className="text-xl font-semibold">Reporter setup</h2>
          <p className="mt-3 text-neutral-600">
            Add the Test Analytics reporter to your Playwright configuration and set an API key from your profile dropdown.
          </p>

          <div className="mt-6 rounded-xl bg-neutral-100 p-4 overflow-auto">
            <pre className="whitespace-pre-wrap text-sm text-neutral-900">
{`reporter: [
  ['html'],
  [
    'test-analytics-reporter',
    {
      backendUrl: 'https://test-analytics-production.up.railway.app/api',
      projectId: '<your-project-id>',
      projectName: '<your-project-name>',
      apiKey: process.env.API_KEY,
      enabled: true,
    },
  ],
],`}
            </pre>
          </div>

          <p className="mt-4 text-sm text-neutral-600">
            Store the API key in your environment and reference it from Playwright so your reporter can upload test results securely.
          </p>
        </div>

        <div className="card p-6 border border-neutral-200 bg-white shadow-sm">
          <h2 className="text-xl font-semibold">Generate an API key</h2>
          <p className="mt-3 text-neutral-600">
            Open your profile dropdown in the top bar and choose <strong>Add API key</strong>. The generated key will appear once and can be copied into your local or CI environment.
          </p>

          <div className="mt-6 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
            <p className="font-medium">Example .env</p>
            <pre className="mt-2 whitespace-pre-wrap">
{`API_KEY=your_generated_api_key_here
`}
          </pre>
          </div>
        </div>

        <AiKeyCard />
      </div>
    </div>
  );
}
