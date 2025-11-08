import { describe, it, expect, vi } from 'vitest';
import { generateDigest } from '../lib/digest';

describe('digest', () => {
  describe('generateDigest', () => {
    it('should be a function', () => {
      expect(typeof generateDigest).toBe('function');
    });
  });
});

