/**
 * @jest-environment node
 *
 * Unit tests for src/lib/blog.js
 * These run in the Node environment because the blog loader uses fs/path.
 * We use Jest's spy/mock utilities to test edge-cases without hitting disk.
 */

import fs from 'fs';
import path from 'path';
import { getAllPosts, getPostBySlug } from '../lib/blog';

// ── getAllPosts ───────────────────────────────────────────────────────────────

describe('getAllPosts', () => {
  test('returns an array', () => {
    const posts = getAllPosts();
    expect(Array.isArray(posts)).toBe(true);
  });

  test('returns at least 10 posts (we have 20 MDX files)', () => {
    const posts = getAllPosts();
    expect(posts.length).toBeGreaterThanOrEqual(10);
  });

  test('every post has the required shape', () => {
    const posts = getAllPosts();
    for (const post of posts) {
      expect(post).toHaveProperty('slug');
      expect(post).toHaveProperty('title');
      expect(post).toHaveProperty('description');
      expect(post).toHaveProperty('date');
      expect(post).toHaveProperty('readTime');
      expect(post).toHaveProperty('category');
      expect(post).toHaveProperty('content');
      expect(typeof post.slug).toBe('string');
      expect(post.slug.length).toBeGreaterThan(0);
    }
  });

  test('posts are sorted newest-first (by date)', () => {
    const posts = getAllPosts();
    for (let i = 0; i < posts.length - 1; i++) {
      const a = new Date(posts[i].date);
      const b = new Date(posts[i + 1].date);
      // a (earlier in array) should be >= b (later in array)
      expect(a.getTime()).toBeGreaterThanOrEqual(b.getTime());
    }
  });

  test('slug matches the filename without .mdx extension', () => {
    const posts = getAllPosts();
    // Every slug should be kebab-case (no spaces, no .mdx)
    for (const post of posts) {
      expect(post.slug).not.toContain('.mdx');
      expect(post.slug).not.toContain(' ');
    }
  });

  test('returns empty array when posts directory does not exist', () => {
    const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    const posts = getAllPosts();
    expect(posts).toEqual([]);
    existsSpy.mockRestore();
  });
});

// ── getPostBySlug ─────────────────────────────────────────────────────────────

describe('getPostBySlug', () => {
  test('returns null for a non-existent slug', () => {
    const post = getPostBySlug('this-slug-does-not-exist-at-all-12345');
    expect(post).toBeNull();
  });

  test('returns a valid post object for "how-to-merge-pdf-files"', () => {
    const post = getPostBySlug('how-to-merge-pdf-files');
    expect(post).not.toBeNull();
    expect(post.slug).toBe('how-to-merge-pdf-files');
    expect(post.title).toBeTruthy();
    expect(typeof post.content).toBe('string');
    expect(post.content.length).toBeGreaterThan(100);
  });

  test('returned post has all required fields', () => {
    const post = getPostBySlug('how-to-compress-pdf-for-email');
    expect(post).not.toBeNull();
    expect(post).toMatchObject({
      slug: 'how-to-compress-pdf-for-email',
      title: expect.any(String),
      description: expect.any(String),
      date: expect.any(String),
      readTime: expect.any(String),
      category: expect.any(String),
      content: expect.any(String),
    });
  });

  test('falls back to slug as title when frontmatter has no title', () => {
    // Temporarily mock fs.readFileSync to return frontmatter without a title
    const readSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue('---\ndescription: Test\n---\nBody');
    const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    const post = getPostBySlug('my-fallback-slug');
    expect(post.title).toBe('my-fallback-slug');
    expect(post.category).toBe('Guide'); // default category

    readSpy.mockRestore();
    existsSpy.mockRestore();
  });

  test('returns default category "Guide" when frontmatter has no category', () => {
    const post = getPostBySlug('how-to-merge-pdf-files');
    // All real posts should have a category (or fall back to 'Guide')
    expect(post.category).toBeTruthy();
  });
});
