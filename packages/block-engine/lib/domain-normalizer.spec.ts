import { DomainNormalizer } from './domain-normalizer.js';
import { describe, expect, it } from 'vitest';

describe('DomainNormalizer.normalize', () => {
  it.each([
    [' https://www.YouTube.com/feed ', 'youtube.com'],
    ['http://m.youtube.com', 'm.youtube.com'],
    ['youtube.com/watch?v=abc', 'youtube.com'],
    ['WWW.Example.COM', 'example.com'],
    ['example.com:8080', 'example.com'],
    ['example.com.', 'example.com'],
    ['https://sub.example.co.jp/path', 'sub.example.co.jp'],
  ])('normalizes %j to %j', (input, expected) => {
    expect(DomainNormalizer.normalize(input)).toBe(expected);
  });
});

describe('DomainNormalizer.isValid', () => {
  it.each(['youtube.com', 'sub.example.co.jp'])('accepts valid domain %j', domain => {
    expect(DomainNormalizer.isValid(domain)).toBe(true);
  });

  it.each([
    ['', 'empty string'],
    ['youtube', 'no TLD'],
    ['http://', 'no host'],
    ['exa mple.com', 'contains whitespace'],
    ['example.c', 'TLD shorter than 2 chars'],
  ])('rejects invalid domain %j (%s)', domain => {
    expect(DomainNormalizer.isValid(domain)).toBe(false);
  });
});
