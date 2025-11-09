'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Insight {
  id: string;
  score: number;
  scoreBreakdown: any;
  why: string;
  recommendation: string;
  actions: Array<{ label: string; ownerHint: string; dueInDays: number }>;
  outreachDraft: string;
  status: 'pending' | 'ready_to_send' | 'approved' | 'sent';
  createdAt: string;
  signal: {
    id: string;
    title: string;
    sourceUrl: string;
    type: string;
    publishedAt: string | null;
  };
  partner: {
    id: string;
    name: string;
  };
  objective: {
    type: string;
    detail: string | null;
  } | null;
}

type ViewMode = 'all' | 'hot' | 'action_queue';

export default function DashboardPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterPartner, setFilterPartner] = useState<string>('');
  const [filterObjective, setFilterObjective] = useState<string>('');
  const [feedbackLoading, setFeedbackLoading] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [selectedInsights, setSelectedInsights] = useState<Set<string>>(new Set());
  const [approveLoading, setApproveLoading] = useState(false);

  useEffect(() => {
    fetchInsights();
  }, [viewMode]);

  const fetchInsights = async () => {
    try {
      setError(null);
      setLoading(true);
      const params = new URLSearchParams();
      if (viewMode === 'hot') {
        params.append('hot', 'true');
      } else if (viewMode === 'action_queue') {
        params.append('status', 'ready_to_send');
      }
      const response = await fetch(`/api/insights?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setInsights(data);
      } else {
        setError('Failed to load insights. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
      setError('Failed to load insights. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (insightId: string, type: 'thumbs_up' | 'thumbs_down' | 'na') => {
    setFeedbackLoading({ ...feedbackLoading, [insightId]: true });
    try {
      const response = await fetch(`/api/insights/${insightId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      if (response.ok) {
        await fetchInsights();
      } else {
        alert('Failed to submit feedback. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setFeedbackLoading({ ...feedbackLoading, [insightId]: false });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const handleApprove = async (insightId: string, status: 'ready_to_send' | 'approved' | 'sent') => {
    try {
      const response = await fetch(`/api/insights/${insightId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        await fetchInsights();
      } else {
        alert('Failed to update status. Please try again.');
      }
    } catch (error) {
      console.error('Error approving insight:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const handleBatchApprove = async () => {
    if (selectedInsights.size === 0) {
      alert('Please select at least one insight.');
      return;
    }

    const count = selectedInsights.size;
    setApproveLoading(true);
    try {
      const response = await fetch('/api/insights/batch-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insightIds: Array.from(selectedInsights),
          status: 'approved',
        }),
      });

      if (response.ok) {
        setSelectedInsights(new Set());
        await fetchInsights();
        alert(`Approved ${count} insight(s).`);
      } else {
        alert('Failed to approve insights. Please try again.');
      }
    } catch (error) {
      console.error('Error batch approving insights:', error);
      alert('Failed to approve insights. Please try again.');
    } finally {
      setApproveLoading(false);
    }
  };

  const toggleInsightSelection = (insightId: string) => {
    const newSelected = new Set(selectedInsights);
    if (newSelected.has(insightId)) {
      newSelected.delete(insightId);
    } else {
      newSelected.add(insightId);
    }
    setSelectedInsights(newSelected);
  };

  const filteredInsights = insights.filter((insight) => {
    if (filterPartner && insight.partner.name.toLowerCase().includes(filterPartner.toLowerCase())) {
      return true;
    }
    if (filterObjective && insight.objective?.type === filterObjective) {
      return true;
    }
    if (!filterPartner && !filterObjective) {
      return true;
    }
    return false;
  });

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-semibold mb-2">Error Loading Insights</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchInsights}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex gap-4">
            <Link href="/partners" className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
              Partners
            </Link>
            <Link href="/objectives" className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
              Objectives
            </Link>
            <Link href="/settings/channels" className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
              Settings
            </Link>
          </div>
        </div>

        <div className="mb-6 space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 rounded ${viewMode === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              All Insights
            </button>
            <button
              onClick={() => setViewMode('hot')}
              className={`px-4 py-2 rounded ${viewMode === 'hot' ? 'bg-red-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              🔥 Hot Signals (≥80)
            </button>
            <button
              onClick={() => setViewMode('action_queue')}
              className={`px-4 py-2 rounded ${viewMode === 'action_queue' ? 'bg-green-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              Action Queue
            </button>
          </div>

          {viewMode === 'action_queue' && selectedInsights.size > 0 && (
            <div className="flex items-center gap-4 bg-blue-50 p-4 rounded">
              <span className="text-sm font-medium">
                {selectedInsights.size} insight(s) selected
              </span>
              <button
                onClick={handleBatchApprove}
                disabled={approveLoading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {approveLoading ? 'Approving...' : 'Batch Approve'}
              </button>
              <button
                onClick={() => setSelectedInsights(new Set())}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Clear Selection
              </button>
            </div>
          )}

          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Filter by partner..."
              value={filterPartner}
              onChange={(e) => setFilterPartner(e.target.value)}
              className="px-4 py-2 border rounded"
            />
            <select
              value={filterObjective}
              onChange={(e) => setFilterObjective(e.target.value)}
              className="px-4 py-2 border rounded"
            >
              <option value="">All objectives</option>
              <option value="integrations">Integrations</option>
              <option value="co_sell">Co-Sell</option>
              <option value="co_market">Co-Marketing</option>
              <option value="marketplace">Marketplace</option>
              <option value="geography">Geography</option>
              <option value="vertical">Vertical</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredInsights.length === 0 ? (
            <div className="bg-white rounded shadow p-8 text-center text-gray-500">
              No insights yet. Add partners and objectives to get started.
            </div>
          ) : (
            filteredInsights.map((insight) => (
              <div key={insight.id} className="bg-white rounded shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {viewMode === 'action_queue' && (
                        <input
                          type="checkbox"
                          checked={selectedInsights.has(insight.id)}
                          onChange={() => toggleInsightSelection(insight.id)}
                          className="w-4 h-4"
                        />
                      )}
                      <Link href={`/partners/${insight.partner.id}`} className="font-semibold text-blue-600 hover:underline">
                        {insight.partner.name}
                      </Link>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                        Score: {insight.score}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                        {insight.signal.type}
                      </span>
                      {insight.status && insight.status !== 'pending' && (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          insight.status === 'ready_to_send' ? 'bg-yellow-100 text-yellow-800' :
                          insight.status === 'approved' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {insight.status === 'ready_to_send' ? 'Ready' :
                           insight.status === 'approved' ? 'Approved' : 'Sent'}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      <a href={insight.signal.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {insight.signal.title}
                      </a>
                    </h3>
                    <p className="text-gray-600 mb-2">{insight.why}</p>
                    <p className="bg-gray-50 p-3 rounded mb-2">{insight.recommendation}</p>
                    <p className="text-sm font-medium text-green-700 mb-4">
                      Action: {insight.actions[0]?.label || 'Reach out'}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Outreach Draft:</span>
                    <button
                      onClick={() => copyToClipboard(insight.outreachDraft)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="bg-gray-50 p-3 rounded mb-4 font-mono text-sm whitespace-pre-wrap">
                    {insight.outreachDraft}
                  </div>

                  {expandedId === insight.id && insight.scoreBreakdown && (
                    <div className="bg-blue-50 p-4 rounded mb-4">
                      <h4 className="font-semibold mb-2">Score Breakdown:</h4>
                      <div className="text-sm space-y-1">
                        <div>Base Score: {insight.scoreBreakdown.baseScore?.toFixed(1)}</div>
                        <div>Recency Multiplier: {insight.scoreBreakdown.recencyMultiplier?.toFixed(2)}x</div>
                        <div>Priority Multiplier: {insight.scoreBreakdown.priorityMultiplier?.toFixed(2)}x</div>
                        <div>Objective Match Bonus: +{insight.scoreBreakdown.objectiveMatchBonus || 0}</div>
                        <div>LLM Adjustment: {insight.scoreBreakdown.llmAdjustment >= 0 ? '+' : ''}{insight.scoreBreakdown.llmAdjustment?.toFixed(1)}</div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setExpandedId(expandedId === insight.id ? null : insight.id)}
                      className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
                    >
                      {expandedId === insight.id ? 'Hide' : 'Show'} Score Breakdown
                    </button>
                    {insight.status === 'pending' && (
                      <button
                        onClick={() => handleApprove(insight.id, 'ready_to_send')}
                        className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                      >
                        Mark Ready
                      </button>
                    )}
                    {insight.status === 'ready_to_send' && (
                      <>
                        <button
                          onClick={() => handleApprove(insight.id, 'approved')}
                          className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleApprove(insight.id, 'sent')}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                        >
                          Mark Sent
                        </button>
                      </>
                    )}
                    {insight.status === 'approved' && (
                      <button
                        onClick={() => handleApprove(insight.id, 'sent')}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                      >
                        Mark Sent
                      </button>
                    )}
                    <button
                      onClick={() => handleFeedback(insight.id, 'thumbs_up')}
                      disabled={feedbackLoading[insight.id]}
                      className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {feedbackLoading[insight.id] ? '...' : '👍 Useful'}
                    </button>
                    <button
                      onClick={() => handleFeedback(insight.id, 'thumbs_down')}
                      disabled={feedbackLoading[insight.id]}
                      className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {feedbackLoading[insight.id] ? '...' : '👎 Not Useful'}
                    </button>
                    <button
                      onClick={() => handleFeedback(insight.id, 'na')}
                      disabled={feedbackLoading[insight.id]}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {feedbackLoading[insight.id] ? '...' : 'Mark N/A'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

