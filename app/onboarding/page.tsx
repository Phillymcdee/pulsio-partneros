'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const OBJECTIVE_TYPES = [
  { value: 'integrations', label: 'Integrations' },
  { value: 'co_sell', label: 'Co-Sell' },
  { value: 'co_market', label: 'Co-Marketing' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'geography', label: 'Geography' },
  { value: 'vertical', label: 'Vertical' },
] as const;

interface Partner {
  id: string;
  name: string;
  domain: string | null;
  rssUrl: string | null;
}

interface Objective {
  id: string;
  type: string;
  detail: string | null;
  priority: number;
}

interface Channel {
  emailEnabled: boolean;
  slackWebhookUrl: string | null;
  cadence: 'daily' | 'weekly';
}

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [message, setMessage] = useState('');

  // Step 1: Partners
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerFormData, setPartnerFormData] = useState({
    name: '',
    domain: '',
    rssUrl: '',
  });

  // Step 2: Objectives
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [objectiveFormData, setObjectiveFormData] = useState({
    type: 'integrations',
    detail: '',
    priority: 1,
  });

  // Step 3: Channels
  const [channelFormData, setChannelFormData] = useState({
    emailEnabled: true,
    slackWebhookUrl: '',
    cadence: 'weekly' as 'daily' | 'weekly',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch existing data
    try {
      const [partnersRes, objectivesRes, channelsRes] = await Promise.all([
        fetch('/api/partners'),
        fetch('/api/objectives'),
        fetch('/api/channels'),
      ]);

      if (partnersRes.ok) {
        const data = await partnersRes.json();
        setPartners(data);
      }
      if (objectivesRes.ok) {
        const data = await objectivesRes.json();
        setObjectives(data);
      }
      if (channelsRes.ok) {
        const data = await channelsRes.json();
        if (data) {
          setChannelFormData({
            emailEnabled: data.emailEnabled,
            slackWebhookUrl: data.slackWebhookUrl || '',
            cadence: data.cadence,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      // Clean up empty strings to undefined
      const payload = {
        name: partnerFormData.name,
        ...(partnerFormData.domain && { domain: partnerFormData.domain }),
        ...(partnerFormData.rssUrl && { rssUrl: partnerFormData.rssUrl }),
      };

      const response = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        await fetchData();
        setPartnerFormData({ name: '', domain: '', rssUrl: '' });
        setMessage('');
      } else {
        setMessage(data.error || data.details || 'Failed to add partner. Please try again.');
      }
    } catch (error) {
      console.error('Error creating partner:', error);
      setMessage('Error creating partner. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/objectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(objectiveFormData),
      });

      if (response.ok) {
        await fetchData();
        setObjectiveFormData({ type: 'integrations', detail: '', priority: 1 });
      }
    } catch (error) {
      console.error('Error creating objective:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChannel = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/channels', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(channelFormData),
      });

      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error saving channel:', error);
    } finally {
      setLoading(false);
    }
  };

  const canProceedFromStep1 = partners.length >= 1;
  const canProceedFromStep2 = objectives.length >= 2;
  const canProceedFromStep3 = channelFormData.emailEnabled || (channelFormData.slackWebhookUrl && channelFormData.slackWebhookUrl.length > 0);

  const handleNext = () => {
    if (currentStep === 1 && canProceedFromStep1) {
      setCurrentStep(2);
    } else if (currentStep === 2 && canProceedFromStep2) {
      handleSaveChannel();
      setCurrentStep(3);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      // Save channel if not already saved
      await handleSaveChannel();

      // Call completion API
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
      });

      if (response.ok) {
        router.push('/dashboard');
      } else {
        alert('Error completing onboarding. Please try again.');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert('Error completing onboarding. Please try again.');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className={`flex-1 ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                  {currentStep > 1 ? '✓' : '1'}
                </div>
                <span className="ml-2 font-medium">Add Partners</span>
              </div>
            </div>
            <div className={`flex-1 mx-4 ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                  {currentStep > 2 ? '✓' : '2'}
                </div>
                <span className="ml-2 font-medium">Set Objectives</span>
              </div>
            </div>
            <div className={`flex-1 ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                  3
                </div>
                <span className="ml-2 font-medium">Configure Delivery</span>
              </div>
            </div>
          </div>
          <div className="flex">
            <div className={`h-1 flex-1 ${currentStep >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`h-1 flex-1 mx-1 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`h-1 flex-1 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`} />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Step 1: Partners */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Add Your Partners</h2>
              <p className="text-gray-600 mb-6">
                Add at least one partner to get started. We'll automatically detect RSS feeds when you provide a domain.
              </p>

              <form onSubmit={handleAddPartner} className="mb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Partner Name *</label>
                  <input
                    type="text"
                    required
                    value={partnerFormData.name}
                    onChange={(e) => setPartnerFormData({ ...partnerFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="e.g., Stripe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Domain</label>
                  <input
                    type="text"
                    value={partnerFormData.domain}
                    onChange={(e) => setPartnerFormData({ ...partnerFormData, domain: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="stripe.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">We'll try to auto-detect RSS feed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">RSS URL (optional)</label>
                  <input
                    type="url"
                    value={partnerFormData.rssUrl}
                    onChange={(e) => setPartnerFormData({ ...partnerFormData, rssUrl: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="https://stripe.com/blog/feed"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Partner'}
                </button>
                {message && (
                  <div className={`mt-2 p-2 rounded text-sm ${message.includes('Error') || message.includes('Failed') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {message}
                  </div>
                )}
              </form>

              <div className="mb-4">
                <Link href="/partners/import" className="text-blue-600 hover:underline text-sm">
                  Or import partners from CSV →
                </Link>
              </div>

              {partners.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Added Partners ({partners.length})</h3>
                  <ul className="space-y-2">
                    {partners.map((partner) => (
                      <li key={partner.id} className="flex justify-between items-center">
                        <span>{partner.name}</span>
                        {partner.rssUrl && (
                          <span className="text-xs text-green-600">RSS detected</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!canProceedFromStep1 && (
                <p className="text-sm text-red-600 mt-4">Please add at least one partner to continue.</p>
              )}
            </div>
          )}

          {/* Step 2: Objectives */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Set Your Objectives</h2>
              <p className="text-gray-600 mb-6">
                Add at least 2 objectives to help us prioritize partner signals for you.
              </p>

              <form onSubmit={handleAddObjective} className="mb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Objective Type *</label>
                  <select
                    required
                    value={objectiveFormData.type}
                    onChange={(e) => setObjectiveFormData({ ...objectiveFormData, type: e.target.value })}
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
                  <label className="block text-sm font-medium mb-1">Detail (optional)</label>
                  <input
                    type="text"
                    value={objectiveFormData.detail}
                    onChange={(e) => setObjectiveFormData({ ...objectiveFormData, detail: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="e.g., Co-list on data marketplaces"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priority *</label>
                  <select
                    required
                    value={objectiveFormData.priority}
                    onChange={(e) => setObjectiveFormData({ ...objectiveFormData, priority: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value={1}>High (1)</option>
                    <option value={2}>Medium (2)</option>
                    <option value={3}>Low (3)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Objective'}
                </button>
              </form>

              {objectives.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Added Objectives ({objectives.length})</h3>
                  <ul className="space-y-2">
                    {objectives.map((objective) => (
                      <li key={objective.id} className="flex justify-between items-center">
                        <span>
                          {OBJECTIVE_TYPES.find(t => t.value === objective.type)?.label || objective.type}
                          {objective.detail && ` - ${objective.detail}`}
                        </span>
                        <span className="text-xs text-gray-500">
                          Priority {objective.priority}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!canProceedFromStep2 && (
                <p className="text-sm text-red-600 mt-4">Please add at least 2 objectives to continue.</p>
              )}
            </div>
          )}

          {/* Step 3: Channels */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Configure Delivery</h2>
              <p className="text-gray-600 mb-6">
                Choose how you want to receive partner insights. Enable at least one delivery method.
              </p>

              <div className="space-y-6">
                <div>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={channelFormData.emailEnabled}
                      onChange={(e) => setChannelFormData({ ...channelFormData, emailEnabled: e.target.checked })}
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
                    value={channelFormData.slackWebhookUrl}
                    onChange={(e) => setChannelFormData({ ...channelFormData, slackWebhookUrl: e.target.value })}
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
                    value={channelFormData.cadence}
                    onChange={(e) => setChannelFormData({ ...channelFormData, cadence: e.target.value as 'daily' | 'weekly' })}
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

              {!canProceedFromStep3 && (
                <p className="text-sm text-red-600 mt-4">
                  Please enable email or provide a Slack webhook URL to continue.
                </p>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <button
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>
            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && !canProceedFromStep1) ||
                  (currentStep === 2 && !canProceedFromStep2) ||
                  loading
                }
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={!canProceedFromStep3 || completing}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {completing ? 'Completing Setup...' : 'Complete Setup'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

