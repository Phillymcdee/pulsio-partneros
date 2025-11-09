import { describe, it, expect } from 'vitest';
import { calculateBaseScore, finalScore, getRecencyMultiplier } from '../scoring';
import type { objectives } from '../schema';

type Objective = typeof objectives.$inferSelect;

describe('scoring', () => {
  const mockObjective: Objective = {
    id: '1',
    userId: 'user1',
    type: 'marketplace',
    detail: 'Test',
    priority: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('getRecencyMultiplier', () => {
    it('should return 1.0 for today', () => {
      const today = new Date();
      expect(getRecencyMultiplier(today)).toBe(1.0);
    });

    it('should return 0.9 for 1-3 days ago', () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      expect(getRecencyMultiplier(twoDaysAgo)).toBe(0.9);
    });

    it('should return 0.7 for 4-7 days ago', () => {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      expect(getRecencyMultiplier(fiveDaysAgo)).toBe(0.7);
    });

    it('should return 0.5 for 8-14 days ago', () => {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      expect(getRecencyMultiplier(tenDaysAgo)).toBe(0.5);
    });

    it('should return 0.3 for 15+ days ago', () => {
      const twentyDaysAgo = new Date();
      twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);
      expect(getRecencyMultiplier(twentyDaysAgo)).toBe(0.3);
    });

    it('should return 0.5 for null date', () => {
      expect(getRecencyMultiplier(null)).toBe(0.5);
    });
  });

  describe('calculateBaseScore', () => {
    it('should calculate score for marketplace signal with priority 1', () => {
      const { score, breakdown } = calculateBaseScore(
        'marketplace',
        new Date(),
        mockObjective
      );

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(breakdown.baseScore).toBeGreaterThan(0);
      expect(breakdown.recencyMultiplier).toBe(1.0);
      expect(breakdown.priorityMultiplier).toBe(1.5);
      expect(breakdown.objectiveMatchBonus).toBe(30);
    });

    it('should apply recency decay', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 20);

      const { score: oldScore } = calculateBaseScore(
        'marketplace',
        oldDate,
        mockObjective
      );

      const { score: newScore } = calculateBaseScore(
        'marketplace',
        new Date(),
        mockObjective
      );

      expect(newScore).toBeGreaterThan(oldScore);
    });

    it('should cap score at 100', () => {
      const { score } = calculateBaseScore(
        'marketplace',
        new Date(),
        { ...mockObjective, priority: 1 }
      );

      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('finalScore', () => {
    it('should add LLM adjustment', () => {
      const baseScore = 50;
      const breakdown = {
        baseScore: 40,
        recencyMultiplier: 1.0,
        priorityMultiplier: 1.5,
        objectiveMatchBonus: 30,
        llmAdjustment: 0,
        signalStrength: 40,
        objectiveFit: 45,
      };

      const { score } = finalScore(baseScore, breakdown, 10);
      expect(score).toBe(60);
    });

    it('should cap score at 100', () => {
      const baseScore = 95;
      const breakdown = {
        baseScore: 40,
        recencyMultiplier: 1.0,
        priorityMultiplier: 1.5,
        objectiveMatchBonus: 30,
        llmAdjustment: 0,
        signalStrength: 40,
        objectiveFit: 45,
      };

      const { score } = finalScore(baseScore, breakdown, 20);
      expect(score).toBe(100);
    });

    it('should floor score at 0', () => {
      const baseScore = 5;
      const breakdown = {
        baseScore: 40,
        recencyMultiplier: 1.0,
        priorityMultiplier: 1.5,
        objectiveMatchBonus: 30,
        llmAdjustment: 0,
        signalStrength: 40,
        objectiveFit: 45,
      };

      const { score } = finalScore(baseScore, breakdown, -10);
      expect(score).toBe(0);
    });
  });
});

