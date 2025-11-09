import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOnboardingStatus, isOnboardingComplete, markOnboardingComplete } from '../onboarding';
import { db } from '../db';

vi.mock('../db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

describe('getOnboardingStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return incomplete status when no partners', async () => {
    // Mock partners count query
    const partnersQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 0 }]),
    };

    // Mock objectives count query
    const objectivesQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 2 }]),
    };

    // Mock channels query
    const channelsQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ emailEnabled: true }]),
    };

    vi.mocked(db.select)
      .mockReturnValueOnce(partnersQuery as any)
      .mockReturnValueOnce(objectivesQuery as any)
      .mockReturnValueOnce(channelsQuery as any);

    const status = await getOnboardingStatus('user-123');
    expect(status.partnersCount).toBe(0);
    expect(status.objectivesCount).toBe(2);
    expect(status.hasChannel).toBe(true);
    expect(status.isComplete).toBe(false);
  });

  it('should return incomplete status when less than 2 objectives', async () => {
    // Mock partners count query
    const partnersQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 1 }]),
    };

    // Mock objectives count query
    const objectivesQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 1 }]),
    };

    // Mock channels query
    const channelsQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ emailEnabled: true }]),
    };

    vi.mocked(db.select)
      .mockReturnValueOnce(partnersQuery as any)
      .mockReturnValueOnce(objectivesQuery as any)
      .mockReturnValueOnce(channelsQuery as any);

    const status = await getOnboardingStatus('user-123');
    expect(status.partnersCount).toBe(1);
    expect(status.objectivesCount).toBe(1);
    expect(status.hasChannel).toBe(true);
    expect(status.isComplete).toBe(false);
  });

  it('should return incomplete status when no channel configured', async () => {
    // Mock partners count query
    const partnersQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 1 }]),
    };

    // Mock objectives count query
    const objectivesQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 2 }]),
    };

    // Mock channels query - no channel configured
    const channelsQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    vi.mocked(db.select)
      .mockReturnValueOnce(partnersQuery as any)
      .mockReturnValueOnce(objectivesQuery as any)
      .mockReturnValueOnce(channelsQuery as any);

    const status = await getOnboardingStatus('user-123');
    expect(status.partnersCount).toBe(1);
    expect(status.objectivesCount).toBe(2);
    expect(status.hasChannel).toBe(false);
    expect(status.isComplete).toBe(false);
  });

  it('should return complete status when all requirements met', async () => {
    // Mock partners count query
    const partnersQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 1 }]),
    };

    // Mock objectives count query
    const objectivesQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 2 }]),
    };

    // Mock channels query - email enabled
    const channelsQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ emailEnabled: true, slackWebhookUrl: null }]),
    };

    vi.mocked(db.select)
      .mockReturnValueOnce(partnersQuery as any)
      .mockReturnValueOnce(objectivesQuery as any)
      .mockReturnValueOnce(channelsQuery as any);

    const status = await getOnboardingStatus('user-123');
    expect(status.partnersCount).toBe(1);
    expect(status.objectivesCount).toBe(2);
    expect(status.hasChannel).toBe(true);
    expect(status.isComplete).toBe(true);
  });

  it('should return complete status when Slack webhook configured', async () => {
    // Mock partners count query
    const partnersQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 1 }]),
    };

    // Mock objectives count query
    const objectivesQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 2 }]),
    };

    // Mock channels query - Slack webhook configured
    const channelsQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ 
        emailEnabled: false, 
        slackWebhookUrl: 'https://hooks.slack.com/services/...' 
      }]),
    };

    vi.mocked(db.select)
      .mockReturnValueOnce(partnersQuery as any)
      .mockReturnValueOnce(objectivesQuery as any)
      .mockReturnValueOnce(channelsQuery as any);

    const status = await getOnboardingStatus('user-123');
    expect(status.partnersCount).toBe(1);
    expect(status.objectivesCount).toBe(2);
    expect(status.hasChannel).toBe(true);
    expect(status.isComplete).toBe(true);
  });
});

describe('isOnboardingComplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true when onboarding is complete', async () => {
    // Mock partners count query
    const partnersQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 1 }]),
    };

    // Mock objectives count query
    const objectivesQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 2 }]),
    };

    // Mock channels query
    const channelsQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ emailEnabled: true }]),
    };

    vi.mocked(db.select)
      .mockReturnValueOnce(partnersQuery as any)
      .mockReturnValueOnce(objectivesQuery as any)
      .mockReturnValueOnce(channelsQuery as any);

    const result = await isOnboardingComplete('user-123');
    expect(result).toBe(true);
  });

  it('should return false when onboarding is incomplete', async () => {
    // Mock partners count query
    const partnersQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 0 }]),
    };

    // Mock objectives count query
    const objectivesQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 2 }]),
    };

    // Mock channels query
    const channelsQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ emailEnabled: true }]),
    };

    vi.mocked(db.select)
      .mockReturnValueOnce(partnersQuery as any)
      .mockReturnValueOnce(objectivesQuery as any)
      .mockReturnValueOnce(channelsQuery as any);

    const result = await isOnboardingComplete('user-123');
    expect(result).toBe(false);
  });
});

describe('markOnboardingComplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should mark onboarding as complete', async () => {
    const mockSelect = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{
        id: 'user-123',
        preferences: {
          signalTypeWeights: {},
          objectiveTypeWeights: {},
          sourceWeights: {},
        },
      }]),
    };

    const mockUpdate = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(db.select).mockReturnValue(mockSelect as any);
    vi.mocked(db.update).mockReturnValue(mockUpdate as any);

    await markOnboardingComplete('user-123');

    expect(db.select).toHaveBeenCalled();
    expect(db.update).toHaveBeenCalled();
    expect(mockUpdate.set).toHaveBeenCalledWith(
      expect.objectContaining({
        preferences: expect.objectContaining({
          onboardingComplete: true,
        }),
      })
    );
  });

  it('should throw error when user not found', async () => {
    const mockSelect = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    vi.mocked(db.select).mockReturnValue(mockSelect as any);

    await expect(markOnboardingComplete('user-123')).rejects.toThrow('User not found');
  });
});

