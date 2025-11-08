'use client';

import { useState, useEffect } from 'react';

interface Channel {
  id: string;
  emailEnabled: boolean;
  slackWebhookUrl: string | null;
  cadence: 'daily' | 'weekly';
}

export default function ChannelsPage() {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    emailEnabled: true,
    slackWebhookUrl: '',
    cadence: 'weekly' as 'daily' | 'weekly',
  });

  useEffect(() => {
    fetchChannel();
  }, []);

  const fetchChannel = async () => {
    try {
      const response = await fetch('/api/channels');
      if (response.ok) {
        const data = await response.json();
        setChannel(data);
        setFormData({
          emailEnabled: data.emailEnabled,
          slackWebhookUrl: data.slackWebhookUrl || '',
          cadence: data.cadence,
        });
      }
    } catch (error) {
      console.error('Error fetching channel:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/channels', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setChannel(data);
        alert('Settings saved successfully!');
      }
    } catch (error) {
      console.error('Error saving channel:', error);
      alert('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Delivery Settings</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded shadow p-6">
          <div className="space-y-6">
            <div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.emailEnabled}
                  onChange={(e) => setFormData({ ...formData, emailEnabled: e.target.checked })}
                  className="w-5 h-5"
                />
                <span className="text-lg font-medium">Enable Email Digest</span>
              </label>
              <p className="text-sm text-gray-600 ml-8 mt-1">
                Receive partner insights via email
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Slack Webhook URL (optional)
              </label>
              <input
                type="url"
                value={formData.slackWebhookUrl}
                onChange={(e) => setFormData({ ...formData, slackWebhookUrl: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="https://hooks.slack.com/services/..."
              />
              <p className="text-sm text-gray-600 mt-1">
                Get digest notifications in Slack
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Digest Frequency</label>
              <select
                value={formData.cadence}
                onChange={(e) => setFormData({ ...formData, cadence: e.target.value as 'daily' | 'weekly' })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
              </select>
              <p className="text-sm text-gray-600 mt-1">
                How often to receive partner insights
              </p>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

