import { SignalType } from './classify';
import type { objectives, users } from '@/lib/schema';

type Objective = typeof objectives.$inferSelect;
type User = typeof users.$inferSelect;

// Signal type base weights
const SIGNAL_TYPE_WEIGHTS: Record<SignalType, number> = {
  marketplace: 40,
  launch: 35,
  funding: 30,
  changelog: 25,
  blog: 15,
  pr: 10,
  hire: 5,
};

// Recency decay multipliers
function getRecencyMultiplier(publishedAt: Date | null): number {
  if (!publishedAt) return 0.5; // No date = lower score

  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) return 1.0;
  if (daysDiff >= 1 && daysDiff <= 3) return 0.9;
  if (daysDiff >= 4 && daysDiff <= 7) return 0.7;
  if (daysDiff >= 8 && daysDiff <= 14) return 0.5;
  return 0.3; // 15+ days
}

// Priority multipliers
const PRIORITY_MULTIPLIERS: Record<number, number> = {
  1: 1.5,
  2: 1.2,
  3: 1.0,
};

// Objective type match bonuses
function getObjectiveMatchBonus(signalType: SignalType, objectiveType: string): number {
  // Exact matches
  if (signalType === 'marketplace' && objectiveType === 'marketplace') return 30;
  if (signalType === 'launch' && objectiveType === 'co_market') return 30;
  if (signalType === 'changelog' && objectiveType === 'integrations') return 30;

  // Related matches
  if (signalType === 'launch' && objectiveType === 'co_sell') return 15;
  if (signalType === 'funding' && objectiveType === 'co_sell') return 15;
  if (signalType === 'changelog' && objectiveType === 'marketplace') return 15;

  return 0;
}

export interface ScoreBreakdown {
  baseScore: number;
  recencyMultiplier: number;
  priorityMultiplier: number;
  objectiveMatchBonus: number;
  llmAdjustment: number;
  signalStrength: number;
  objectiveFit: number;
}

/**
 * Calculates base rule-based score
 */
export function calculateBaseScore(
  signalType: SignalType,
  publishedAt: Date | null,
  objective: Objective,
  userPreferences?: User['preferences']
): { score: number; breakdown: ScoreBreakdown } {
  const baseScore = SIGNAL_TYPE_WEIGHTS[signalType] || 15;
  const recencyMultiplier = getRecencyMultiplier(publishedAt);
  const priorityMultiplier = PRIORITY_MULTIPLIERS[objective.priority] || 1.0;
  const objectiveMatchBonus = getObjectiveMatchBonus(signalType, objective.type);

  // Apply user preference weights if available
  const signalTypeWeight = userPreferences?.signalTypeWeights?.[signalType] || 1.0;
  const objectiveTypeWeight = userPreferences?.objectiveTypeWeights?.[objective.type] || 1.0;

  const adjustedBaseScore = baseScore * signalTypeWeight;
  const signalStrength = adjustedBaseScore * recencyMultiplier;
  const objectiveFit = objectiveMatchBonus * objectiveTypeWeight * priorityMultiplier;

  const score = Math.min(100, Math.max(0, signalStrength + objectiveFit));

  return {
    score,
    breakdown: {
      baseScore: adjustedBaseScore,
      recencyMultiplier,
      priorityMultiplier,
      objectiveMatchBonus,
      llmAdjustment: 0, // Will be added by LLM enhancement
      signalStrength,
      objectiveFit,
    },
  };
}

/**
 * Final score with LLM adjustment
 */
export function finalScore(
  baseScore: number,
  breakdown: ScoreBreakdown,
  llmAdjustment: number
): { score: number; breakdown: ScoreBreakdown } {
  const finalScore = Math.min(100, Math.max(0, baseScore + llmAdjustment));
  return {
    score: finalScore,
    breakdown: {
      ...breakdown,
      llmAdjustment,
    },
  };
}

