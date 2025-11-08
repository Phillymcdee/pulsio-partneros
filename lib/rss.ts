import Parser from 'rss-parser';
import { parse } from 'node-html-parser';

const parser = new Parser();

export interface ParsedFeed {
  title: string;
  items: Array<{
    title: string;
    link: string;
    pubDate?: string;
    content?: string;
    contentSnippet?: string;
  }>;
}

const COMMON_RSS_PATHS = [
  '/feed',
  '/rss',
  '/rss.xml',
  '/feed.xml',
  '/blog/feed',
  '/blog/rss',
  '/news/feed',
  '/company-news/rss.xml',
];

/**
 * Tries to detect RSS feed URL from a domain
 */
export async function detectRssUrl(domain: string): Promise<string | null> {
  // If domain already looks like a URL, validate it first
  if (domain.startsWith('http')) {
    if (await validateFeedUrl(domain)) {
      return domain;
    }
  }

  // Ensure domain has protocol
  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
  const url = new URL(baseUrl);

  // Try common RSS paths
  for (const path of COMMON_RSS_PATHS) {
    const testUrl = `${url.origin}${path}`;
    if (await validateFeedUrl(testUrl)) {
      return testUrl;
    }
  }

  // Try parsing HTML for RSS link tags
  try {
    const htmlUrl = url.toString();
    const response = await fetch(htmlUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PartnerOS/1.0)',
      },
    });
    const html = await response.text();
    const root = parse(html);
    
    const rssLinks = root.querySelectorAll('link[type="application/rss+xml"], link[type="application/atom+xml"]');
    for (const link of rssLinks) {
      const href = link.getAttribute('href');
      if (href) {
        const absoluteUrl = new URL(href, url.origin).toString();
        if (await validateFeedUrl(absoluteUrl)) {
          return absoluteUrl;
        }
      }
    }
  } catch (error) {
    // Silently fail HTML parsing
    console.error('Failed to parse HTML for RSS links:', error);
  }

  return null;
}

/**
 * Validates if a URL is a valid RSS/Atom feed
 */
export async function validateFeedUrl(url: string): Promise<boolean> {
  try {
    const feed = await parser.parseURL(url);
    return feed && feed.items && feed.items.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Fetches and parses an RSS feed
 */
export async function fetchFeed(url: string): Promise<ParsedFeed | null> {
  try {
    const feed = await parser.parseURL(url);
    return {
      title: feed.title || '',
      items: feed.items.map((item) => ({
        title: item.title || '',
        link: item.link || '',
        pubDate: item.pubDate,
        content: item.content,
        contentSnippet: item.contentSnippet,
      })),
    };
  } catch (error) {
    console.error('Failed to fetch feed:', error);
    return null;
  }
}

/**
 * Generates deduplication hash from URL and title
 */
export function generateDedupeHash(url: string, title: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha1').update(`${url}|${title}`).digest('hex');
}

