import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectRssUrl, validateFeedUrl, generateDedupeHash, fetchFeed } from '../lib/rss';
import Parser from 'rss-parser';

vi.mock('rss-parser');
vi.mock('node-html-parser');

describe('rss', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateDedupeHash', () => {
    it('should generate consistent hash for same URL and title', () => {
      const hash1 = generateDedupeHash('https://example.com/post', 'Test Title');
      const hash2 = generateDedupeHash('https://example.com/post', 'Test Title');
      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different URLs', () => {
      const hash1 = generateDedupeHash('https://example.com/post1', 'Test Title');
      const hash2 = generateDedupeHash('https://example.com/post2', 'Test Title');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('validateFeedUrl', () => {
    it('should return true for valid RSS feed', async () => {
      const mockParser = {
        parseURL: vi.fn().mockResolvedValue({
          title: 'Test Feed',
          items: [{ title: 'Item 1' }],
        }),
      };

      vi.mocked(Parser).mockImplementation(() => mockParser as any);

      const result = await validateFeedUrl('https://example.com/feed');
      expect(result).toBe(true);
    });

    it('should return false for invalid feed', async () => {
      const mockParser = {
        parseURL: vi.fn().mockRejectedValue(new Error('Invalid feed')),
      };

      vi.mocked(Parser).mockImplementation(() => mockParser as any);

      const result = await validateFeedUrl('https://example.com/invalid');
      expect(result).toBe(false);
    });
  });

  describe('fetchFeed', () => {
    it('should parse feed correctly', async () => {
      const mockFeed = {
        title: 'Test Feed',
        items: [
          {
            title: 'Item 1',
            link: 'https://example.com/item1',
            pubDate: '2024-01-01',
            content: 'Content 1',
            contentSnippet: 'Snippet 1',
          },
        ],
      };

      const mockParser = {
        parseURL: vi.fn().mockResolvedValue(mockFeed),
      };

      vi.mocked(Parser).mockImplementation(() => mockParser as any);

      const result = await fetchFeed('https://example.com/feed');
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Test Feed');
      expect(result?.items).toHaveLength(1);
      expect(result?.items[0].title).toBe('Item 1');
    });

    it('should return null on error', async () => {
      const mockParser = {
        parseURL: vi.fn().mockRejectedValue(new Error('Fetch error')),
      };

      vi.mocked(Parser).mockImplementation(() => mockParser as any);

      const result = await fetchFeed('https://example.com/feed');
      expect(result).toBeNull();
    });
  });
});

