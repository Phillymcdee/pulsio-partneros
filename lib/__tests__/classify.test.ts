import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classifyType } from '../lib/classify';
import OpenAI from 'openai';

vi.mock('openai');

describe('classifyType', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should classify signal type correctly', async () => {
    const mockOpenAI = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{
              message: {
                content: 'marketplace',
              },
            }],
          }),
        },
      },
    };

    vi.mocked(OpenAI).mockImplementation(() => mockOpenAI as any);

    const result = await classifyType('New Marketplace Launch', 'We are launching a new marketplace');
    expect(result).toBe('marketplace');
  });

  it('should fallback to blog for invalid type', async () => {
    const mockOpenAI = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{
              message: {
                content: 'invalid_type',
              },
            }],
          }),
        },
      },
    };

    vi.mocked(OpenAI).mockImplementation(() => mockOpenAI as any);

    const result = await classifyType('Some Title', 'Some content');
    expect(result).toBe('blog');
  });

  it('should fallback to blog on error', async () => {
    const mockOpenAI = {
      chat: {
        completions: {
          create: vi.fn().mockRejectedValue(new Error('API Error')),
        },
      },
    };

    vi.mocked(OpenAI).mockImplementation(() => mockOpenAI as any);

    const result = await classifyType('Some Title', 'Some content');
    expect(result).toBe('blog');
  });
});

