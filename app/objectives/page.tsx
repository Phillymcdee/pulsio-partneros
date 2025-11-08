'use client';

import { useState, useEffect } from 'react';

const OBJECTIVE_TYPES = [
  { value: 'integrations', label: 'Integrations' },
  { value: 'co_sell', label: 'Co-Sell' },
  { value: 'co_market', label: 'Co-Marketing' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'geography', label: 'Geography' },
  { value: 'vertical', label: 'Vertical' },
] as const;

interface Objective {
  id: string;
  type: string;
  detail: string | null;
  priority: number;
  createdAt: string;
}

export default function ObjectivesPage() {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'integrations',
    detail: '',
    priority: 1,
  });

  useEffect(() => {
    fetchObjectives();
  }, []);

  const fetchObjectives = async () => {
    try {
      const response = await fetch('/api/objectives');
      if (response.ok) {
        const data = await response.json();
        setObjectives(data);
      }
    } catch (error) {
      console.error('Error fetching objectives:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/objectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchObjectives();
        setFormData({ type: 'integrations', detail: '', priority: 1 });
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Error creating objective:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this objective?')) return;

    try {
      const response = await fetch(`/api/objectives/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchObjectives();
      }
    } catch (error) {
      console.error('Error deleting objective:', error);
    }
  };

  const getPriorityLabel = (priority: number) => {
    return priority === 1 ? 'High' : priority === 2 ? 'Medium' : 'Low';
  };

  const getPriorityColor = (priority: number) => {
    return priority === 1 ? 'bg-red-100 text-red-800' : priority === 2 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Objectives</h1>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Objective
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-white rounded shadow">
            <h2 className="text-xl font-semibold mb-4">Add New Objective</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type *</label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                >
                  {OBJECTIVE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Detail</label>
                <input
                  type="text"
                  value={formData.detail}
                  onChange={(e) => setFormData({ ...formData, detail: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="e.g., Co-list on data marketplaces"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Priority *</label>
                <select
                  required
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value={1}>High (1)</option>
                  <option value={2}>Medium (2)</option>
                  <option value={3}>Low (3)</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create Objective
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="bg-white rounded shadow overflow-hidden">
          {objectives.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No objectives yet. Add your first objective to get started.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {objectives.map((objective) => (
                <div key={objective.id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">
                          {OBJECTIVE_TYPES.find(t => t.value === objective.type)?.label || objective.type}
                        </h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(objective.priority)}`}>
                          {getPriorityLabel(objective.priority)}
                        </span>
                      </div>
                      {objective.detail && (
                        <p className="text-gray-600">{objective.detail}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(objective.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

