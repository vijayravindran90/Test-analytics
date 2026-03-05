import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useProjects } from '../api/hooks';
import apiClient from '../api/client';

export default function Projects() {
  const { projects, loading, error } = useProjects();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', owner: '' });
  const [creating, setCreating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Debug logging
  console.log('Projects component:', { projects, loading, error, projectsLength: projects?.length });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setSubmitError(null);

    try {
      await apiClient.post('/projects', formData);
      setFormData({ name: '', description: '', owner: '' });
      setShowForm(false);
      // Reload projects
      window.location.reload();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  if (error) {
    return (
      <div className="card p-6 border-danger-200 bg-danger-50">
        <p className="text-danger-700">Error loading projects: {error}</p>
        <p className="text-sm text-neutral-600 mt-2">
          API URL: {process.env.REACT_APP_API_URL || 'Not set'}
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 btn btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-neutral-600 mt-1">Manage and view your test projects</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Project
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Project Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="My Project"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Project description"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Owner
            </label>
            <input
              type="text"
              value={formData.owner}
              onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="John Doe"
            />
          </div>
          {submitError && (
            <div className="p-3 bg-danger-50 border border-danger-200 text-danger-700 rounded-lg">
              {submitError}
            </div>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={creating} className="btn btn-primary">
              {creating ? 'Creating...' : 'Create Project'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="card p-6 text-center">
          <p className="text-neutral-600">Loading projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-neutral-600 text-lg mb-4">No projects yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
          >
            Create Your First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/project/${project.id}`}
              className="card p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-xl font-semibold text-neutral-900">{project.name}</h3>
              {project.description && (
                <p className="text-neutral-600 mt-2 text-sm">{project.description}</p>
              )}
              {project.owner && (
                <p className="text-neutral-500 mt-4 text-xs">Owner: {project.owner}</p>
              )}
              <div className="mt-4 text-primary-500 font-medium text-sm">
                View Dashboard →
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
