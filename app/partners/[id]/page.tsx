'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Signal {
  id: string;
  title: string;
  sourceUrl: string;
  type: string;
  summary: string;
  publishedAt: string | null;
  createdAt: string;
}

interface Insight {
  id: string;
  score: number;
  why: string;
  recommendation: string;
  actions: Array<{ label: string; ownerHint: string; dueInDays: number }>;
  outreachDraft: string;
  createdAt: string;
}

interface Partner {
  id: string;
  name: string;
  domain: string | null;
  rssUrl: string | null;
  githubOrg: string | null;
  notes: string | null;
}

export default function PartnerPage() {
  const params = useParams();
  const partnerId = params.id as string;
  
  const [partner, setPartner] = useState<Partner | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [deeperPlayLoading, setDeeperPlayLoading] = useState(false);
  const [deeperPlayDraft, setDeeperPlayDraft] = useState<{ outreachDraft: string; suggestedPlay: string } | null>(null);

  useEffect(() => {
    if (partnerId) {
      fetchPartner();
      fetchSignals();
      fetchInsights();
    }
  }, [partnerId]);

  const fetchPartner = async () => {
    try {
      const response = await fetch(`/api/partners/${partnerId}`);
      if (response.ok) {
        const data = await response.json();
        setPartner(data);
      }
    } catch (error) {
      console.error('Error fetching partner:', error);
    }
  };

  const fetchSignals = async () => {
    try {
      const response = await fetch(`/api/partners/${partnerId}/signals`);
      if (response.ok) {
        const data = await response.json();
        setSignals(data);
      }
    } catch (error) {
      console.error('Error fetching signals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    try {
      const response = await fetch(`/api/partners/${partnerId}/insights`);
      if (response.ok) {
        const data = await response.json();
        setInsights(data);
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
    }
  };

  const handleDeeperPlay = async () => {
    setDeeperPlayLoading(true);
    try {
      const response = await fetch(`/api/partners/${partnerId}/deeper-play`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setDeeperPlayDraft(data);
      } else {
        alert('Failed to generate deeper play draft. Please try again.');
      }
    } catch (error) {
      console.error('Error generating deeper play draft:', error);
      alert('Failed to generate deeper play draft. Please try again.');
    } finally {
      setDeeperPlayLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!partner) {
    return <div className="p-8">Partner not found</div>;
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/partners" className="text-blue-600 hover:underline mb-4 inline-block">
            ← Back to Partners
          </Link>
          <h1 className="text-3xl font-bold">{partner.name}</h1>
          {partner.domain && (
            <p className="text-gray-600 mt-2">
              <a href={`https://${partner.domain}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {partner.domain}
              </a>
            </p>
          )}
          {partner.notes && (
            <p className="text-gray-600 mt-2">{partner.notes}</p>
          )}
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Insights</h2>
            <button
              onClick={handleDeeperPlay}
              disabled={deeperPlayLoading}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deeperPlayLoading ? 'Generating...' : '🎯 Nudge Deeper Play'}
            </button>
          </div>

          {deeperPlayDraft && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-purple-900 mb-2">Suggested Deeper Play</h3>
                  <p className="text-purple-700 mb-4">{deeperPlayDraft.suggestedPlay}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(deeperPlayDraft.outreachDraft)}
                  className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Copy Draft
                </button>
              </div>
              <div className="bg-white p-4 rounded border border-purple-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Outreach Draft:</p>
                <div className="font-mono text-sm whitespace-pre-wrap text-gray-800">
                  {deeperPlayDraft.outreachDraft}
                </div>
              </div>
            </div>
          )}

          {insights.length === 0 ? (
            <div className="bg-white rounded shadow p-6 text-center text-gray-500">
              No insights yet. Signals will be processed automatically.
            </div>
          ) : (
            <div className="space-y-4">
              {insights.map((insight) => (
                <div key={insight.id} className="bg-white rounded shadow p-6">
                  <div className="flex justify-between items-start mb-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                      Score: {insight.score}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">{insight.why}</p>
                  <p className="bg-gray-50 p-3 rounded mb-2">{insight.recommendation}</p>
                  <p className="text-sm font-medium text-green-700 mb-2">
                    Action: {insight.actions[0]?.label || 'Reach out'}
                  </p>
                  <div className="bg-gray-50 p-3 rounded font-mono text-sm whitespace-pre-wrap">
                    {insight.outreachDraft}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Signals Timeline</h2>
          {signals.length === 0 ? (
            <div className="bg-white rounded shadow p-6 text-center text-gray-500">
              No signals yet. RSS feed will be processed automatically.
            </div>
          ) : (
            <div className="space-y-4">
              {signals.map((signal) => (
                <div key={signal.id} className="bg-white rounded shadow p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold">
                      <a href={signal.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {signal.title}
                      </a>
                    </h3>
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                      {signal.type}
                    </span>
                  </div>
                  {signal.publishedAt && (
                    <p className="text-sm text-gray-500 mb-2">
                      Published: {new Date(signal.publishedAt).toLocaleDateString()}
                    </p>
                  )}
                  <p className="text-gray-600">{signal.summary}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

