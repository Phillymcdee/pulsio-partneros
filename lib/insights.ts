import OpenAI from 'openai';
import type { objectives, signals } from '@/lib/schema';
import { calculateBaseScore, finalScore, ScoreBreakdown } from './scoring';
import { SignalType } from './classify';

// Map objective types to human-readable labels
const OBJECTIVE_TYPE_LABELS: Record<string, string> = {
  integrations: 'Integrations',
  co_sell: 'Co-Sell',
  co_market: 'Co-Marketing',
  marketplace: 'Marketplace',
  geography: 'Geography',
  vertical: 'Vertical',
};

/**
 * Formats objective type enum value to human-readable label
 */
function formatObjectiveType(type: string): string {
  return OBJECTIVE_TYPE_LABELS[type] || type;
}

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
Objectives: ${JSON.stringify(objectives.map(obj => ({
  type: formatObjectiveType(obj.type),
  detail: obj.detail,
  priority: obj.priority === 1 ? 'highest' : obj.priority === 2 ? 'medium' : 'low'
})))}
Signal: ${JSON.stringify({
  title: signal.title,
  type: signal.type,
  summary: signal.summary,
  url: signal.sourceUrl,
  facets: signal.facets,
})}

Analyze how this signal relates to the user's objectives and explain the connection clearly.

IMPORTANT: When referencing objective types in your response, use the formatted names shown above (e.g., "Co-Marketing" not "co_market", "Co-Sell" not "co_sell").

Return JSON with keys:
{
  "why": string (2-3 sentences explaining SPECIFICALLY why this signal matters for the objectives. Reference the objective type(s) using the formatted names (e.g., "Co-Marketing", "Co-Sell") and detail(s) if provided. For blog posts, explain what in the content makes it relevant. Be concrete and specific - don't use generic phrases. Example: "This blog post about [topic] aligns with your Co-Marketing objective because [specific reason]. The mention of [specific detail] suggests [specific opportunity]."),
  "score": number (0-100, semantic relevance score based on how well the signal content matches the objectives),
  "recommendation": string (one sentence recommendation),
  "actions": [{"label": string, "ownerHint": string, "dueInDays": number}],
  "outreachDraft": string (ready-to-send email draft, personalized with partner name. Format: greeting, reference the signal title naturally within a sentence, suggest partnership opportunity, call to action, closing. Keep it concise and professional, 3-4 sentences max. Do not put the signal title on its own line - integrate it naturally into the sentence flow.)
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
      outreachDraft: formatOutreachDraft(parsed.outreachDraft || generateDefaultOutreachDraft(signal)),
      breakdown: finalBreakdown,
    };
  } catch (error) {
    console.error('Error generating insight:', error);
    // Fallback to rule-based insight
    return {
      why: `This ${signal.type} signal aligns with your ${formatObjectiveType(primaryObjective.type)} objective.`,
      score: baseScore,
      recommendation: 'Consider reaching out to explore opportunities.',
      actions: [
        {
          label: 'Reach out to partner',
          ownerHint: 'Partner Manager',
          dueInDays: 7,
        },
      ],
      outreachDraft: formatOutreachDraft(generateDefaultOutreachDraft(signal)),
      breakdown,
    };
  }
}

function generateDefaultOutreachDraft(signal: Signal): string {
  return `Hi there,

I noticed "${signal.title}" and thought it might be relevant to explore potential partnership opportunities.

Would you be open to a quick conversation?

Best regards`;
}

/**
 * Formats outreach draft to ensure proper line breaks and flow
 * Removes awkward line breaks and ensures signal titles are integrated naturally
 */
export function formatOutreachDraft(draft: string): string {
  if (!draft) return draft;
  
  // First, fix common patterns where signal titles are on their own line
  // Pattern: "I noticed\nTitle\nand thought" -> "I noticed Title and thought"
  let formatted = draft
    .replace(/(I noticed|I saw|I came across|I read about)\s*\n+([A-Z][^\n]+)\s*\n+(and thought|and|which)/gi, 
      (match, prefix, title, suffix) => `${prefix} "${title}" ${suffix}`)
    .replace(/(I noticed|I saw|I came across|I read about)\s*\n+([A-Z][^\n]+)\s*\n+/gi, 
      (match, prefix, title) => `${prefix} "${title}" `);
  
  // Split into lines and process
  const lines = formatted.split('\n');
  const result: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const nextLine = i < lines.length - 1 ? lines[i + 1]?.trim() : '';
    
    // Skip empty lines at the start
    if (result.length === 0 && !line) continue;
    
    // If current line ends mid-sentence (no punctuation) and next line looks like a continuation
    // (starts with capital but isn't a greeting/closing), merge them
    if (line && nextLine && 
        !line.match(/[.!?:]$/) && 
        nextLine.match(/^[A-Z]/) &&
        !nextLine.match(/^(Hi|Hello|I|We|Would|Best|Thanks|Thank|Regards|Sincerely)/i) &&
        line.length < 100) { // Don't merge if line is already very long
      result.push(line + ' ' + nextLine);
      i++; // Skip next line since we merged it
      continue;
    }
    
    result.push(line);
  }
  
  // Join and clean up multiple consecutive newlines
  return result
    .join('\n')
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
    .replace(/\s+$/gm, '') // Remove trailing whitespace from each line
    .trim();
}

