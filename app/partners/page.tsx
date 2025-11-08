'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Partner {
  id: string;
  name: string;
  domain: string | null;
  rssUrl: string | null;
  githubOrg: string | null;
  notes: string | null;
  createdAt: string;
}

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    rssUrl: '',
    githubOrg: '',
    notes: '',
  });

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const response = await fetch('/api/partners');
      if (response.ok) {
        const data = await response.json();
        setPartners(data);
      }
    } catch (error) {
      console.error('Error fetching partners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchPartners();
        setFormData({ name: '', domain: '', rssUrl: '', githubOrg: '', notes: '' });
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Error creating partner:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this partner?')) return;

    try {
      const response = await fetch(`/api/partners/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchPartners();
      }
    } catch (error) {
      console.error('Error deleting partner:', error);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Partners</h1>
          <div className="flex gap-4">
            <Link
              href="/partners/import"
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Import CSV
            </Link>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add Partner
            </button>
          </div>
        </div>

        {showAddForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-white rounded shadow">
            <h2 className="text-xl font-semibold mb-4">Add New Partner</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Domain</label>
                <input
                  type="text"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">RSS URL</label>
                <input
                  type="url"
                  value={formData.rssUrl}
                  onChange={(e) => setFormData({ ...formData, rssUrl: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="https://example.com/feed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">GitHub Org</label>
                <input
                  type="text"
                  value={formData.githubOrg}
                  onChange={(e) => setFormData({ ...formData, githubOrg: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="organization"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  rows={3}
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create Partner
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
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Domain</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">RSS URL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {partners.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    No partners yet. Add your first partner to get started.
                  </td>
                </tr>
              ) : (
                partners.map((partner) => (
                  <tr key={partner.id}>
                    <td className="px-6 py-4">
                      <Link href={`/partners/${partner.id}`} className="text-blue-600 hover:underline">
                        {partner.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{partner.domain || '-'}</td>
                    <td className="px-6 py-4 text-sm">
                      {partner.rssUrl ? (
                        <a href={partner.rssUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {partner.rssUrl.length > 40 ? `${partner.rssUrl.substring(0, 40)}...` : partner.rssUrl}
                        </a>
                      ) : (
                        <span className="text-gray-400">Not detected</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDelete(partner.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

