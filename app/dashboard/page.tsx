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

export default function DashboardPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterPartner, setFilterPartner] = useState<string>('');
  const [filterObjective, setFilterObjective] = useState<string>('');

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const response = await fetch('/api/insights');
      if (response.ok) {
        const data = await response.json();
        setInsights(data);
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (insightId: string, type: 'thumbs_up' | 'thumbs_down' | 'na') => {
    try {
      const response = await fetch(`/api/insights/${insightId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      if (response.ok) {
        await fetchInsights();
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
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
    return <div className="p-8">Loading...</div>;
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

        <div className="mb-6 flex gap-4">
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
                      <Link href={`/partners/${insight.partner.id}`} className="font-semibold text-blue-600 hover:underline">
                        {insight.partner.name}
                      </Link>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                        Score: {insight.score}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                        {insight.signal.type}
                      </span>
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

                  <div className="flex gap-2">
                    <button
                      onClick={() => setExpandedId(expandedId === insight.id ? null : insight.id)}
                      className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
                    >
                      {expandedId === insight.id ? 'Hide' : 'Show'} Score Breakdown
                    </button>
                    <button
                      onClick={() => handleFeedback(insight.id, 'thumbs_up')}
                      className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200"
                    >
                      👍 Useful
                    </button>
                    <button
                      onClick={() => handleFeedback(insight.id, 'thumbs_down')}
                      className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
                    >
                      👎 Not Useful
                    </button>
                    <button
                      onClick={() => handleFeedback(insight.id, 'na')}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                    >
                      Mark N/A
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

