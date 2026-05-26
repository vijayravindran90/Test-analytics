import React from 'react';
import { Link } from 'react-router-dom';

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
      </div>
    </div>
  );
}
