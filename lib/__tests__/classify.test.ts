import { describe, it, expect, vi, beforeEach } from 'vitest';
import OpenAI from 'openai';

// Mock OpenAI before importing classify
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    })),
  };
});

import { classifyType } from '../classify';

describe('classifyType', () => {
  let mockOpenAI: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOpenAI = new OpenAI();
  });

  it('should classify signal type correctly', async () => {
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{
        message: {
          content: 'marketplace',
        },
      }],
    });

    const result = await classifyType('New Marketplace Launch', 'We are launching a new marketplace');
    expect(result).toBe('marketplace');
  });

  it('should fallback to blog for invalid type', async () => {
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{
        message: {
          content: 'invalid_type',
        },
      }],
    });

    const result = await classifyType('Some Title', 'Some content');
    expect(result).toBe('blog');
  });

  it('should fallback to blog on error', async () => {
    mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

    const result = await classifyType('Some Title', 'Some content');
    expect(result).toBe('blog');
  });
});

