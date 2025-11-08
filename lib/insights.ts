import OpenAI from 'openai';
import type { objectives, signals } from '@/lib/schema';
import { calculateBaseScore, finalScore, ScoreBreakdown } from './scoring';
import { SignalType } from './classify';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Objective = typeof objectives.$inferSelect;
type Signal = typeof signals.$inferSelect;

export interface InsightResult {
  why: string;
  score: number;
  recommendation: string;
  actions: Array<{
    label: string;
    ownerHint: string;
    dueInDays: number;
  }>;
  outreachDraft: string;
  breakdown: ScoreBreakdown;
}

/**
 * Generates insight for a signal against objectives
 */
export async function generateInsight(
  signal: Signal,
  objectives: Objective[],
  userPreferences?: any
): Promise<InsightResult | null> {
  if (objectives.length === 0) {
    return null;
  }

  // Calculate base score for the highest priority objective
  const primaryObjective = objectives.sort((a, b) => a.priority - b.priority)[0];
  const { score: baseScore, breakdown } = calculateBaseScore(
    signal.type as SignalType,
    signal.publishedAt,
    primaryObjective,
    userPreferences
  );

  try {
    // Use mid-tier model for insight generation
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a partnerships strategist. Return valid JSON only.',
        },
        {
          role: 'user',
          content: `Given:
Objectives: ${JSON.stringify(objectives)}
Signal: ${JSON.stringify({
  title: signal.title,
  type: signal.type,
  summary: signal.summary,
  url: signal.sourceUrl,
  facets: signal.facets,
})}

Return JSON with keys:
{
  "why": string (explain why this signal matters for the objectives),
  "score": number (0-100, semantic relevance score),
  "recommendation": string (one sentence recommendation),
  "actions": [{"label": string, "ownerHint": string, "dueInDays": number}],
  "outreachDraft": string (ready-to-send email draft, personalized with partner name)
}`,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content);
    
    // Calculate LLM adjustment (semantic relevance - base score, capped at ±20)
    const llmScore = parsed.score || baseScore;
    const llmAdjustment = Math.max(-20, Math.min(20, llmScore - baseScore));

    const { score: finalScoreValue, breakdown: finalBreakdown } = finalScore(
      baseScore,
      breakdown,
      llmAdjustment
    );

    return {
      why: parsed.why || 'This signal may be relevant to your objectives.',
      score: finalScoreValue,
      recommendation: parsed.recommendation || 'Consider reaching out.',
      actions: parsed.actions || [
        {
          label: 'Reach out to partner',
          ownerHint: 'Partner Manager',
          dueInDays: 7,
        },
      ],
      outreachDraft: parsed.outreachDraft || generateDefaultOutreachDraft(signal),
      breakdown: finalBreakdown,
    };
  } catch (error) {
    console.error('Error generating insight:', error);
    // Fallback to rule-based insight
    return {
      why: `This ${signal.type} signal aligns with your ${primaryObjective.type} objective.`,
      score: baseScore,
      recommendation: 'Consider reaching out to explore opportunities.',
      actions: [
        {
          label: 'Reach out to partner',
          ownerHint: 'Partner Manager',
          dueInDays: 7,
        },
      ],
      outreachDraft: generateDefaultOutreachDraft(signal),
      breakdown,
    };
  }
}

function generateDefaultOutreachDraft(signal: Signal): string {
  return `Hi there,

I noticed ${signal.title} and thought it might be relevant to explore potential partnership opportunities.

Would you be open to a quick conversation?

Best regards`;
}

