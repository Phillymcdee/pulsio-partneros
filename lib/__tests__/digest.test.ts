import { describe, it, expect, vi } from 'vitest';
import { generateDigest } from '../digest';

describe('digest', () => {
  describe('generateDigest', () => {
    it('should be a function', () => {
      expect(typeof generateDigest).toBe('function');
    });
  });
});

