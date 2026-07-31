/**
 * @jest-environment node
 *
 * blog.js reads MDX files from the filesystem, so it must run in Node.
 */
import { getAllPosts, getPostBySlug } from '../../src/lib/blog.js';

describe('getAllPosts', () => {
  test('returns an array', () => {
    const posts = getAllPosts();
    expect(Array.isArray(posts)).toBe(true);
  });

  test('returns at least the known seeded posts', () => {
    const posts = getAllPosts();
    // We have 20 blog posts in the repo
    expect(posts.length).toBeGreaterThanOrEqual(10);
  });

  test('each post has required fields', () => {
    const posts = getAllPosts();
    for (const post of posts) {
      expect(post).toHaveProperty('slug');
      expect(post).toHaveProperty('title');
      expect(post).toHaveProperty('description');
      expect(post).toHaveProperty('date');
      expect(post).toHaveProperty('content');
      expect(typeof post.slug).toBe('string');
      expect(typeof post.title).toBe('string');
      expect(typeof post.content).toBe('string');
    }
  });

  test('posts are sorted newest-first', () => {
    const posts = getAllPosts();
    if (posts.length < 2) return; // not enough posts to test ordering
    for (let i = 0; i < posts.length - 1; i++) {
      const a = new Date(posts[i].date).getTime();
      const b = new Date(posts[i + 1].date).getTime();
      // Allow equal dates; strict descending otherwise
      expect(a).toBeGreaterThanOrEqual(b);
    }
  });

  test('slug matches the filename (no .mdx extension)', () => {
    const posts = getAllPosts();
    for (const post of posts) {
      expect(post.slug).not.toContain('.mdx');
      expect(post.slug).not.toContain('/');
    }
  });
});

describe('getPostBySlug', () => {
  test('returns null for a nonexistent slug', () => {
    expect(getPostBySlug('this-post-does-not-exist')).toBeNull();
  });

  test('returns a post object for a known slug', () => {
    const post = getPostBySlug('how-to-merge-pdf-files');
    expect(post).not.toBeNull();
    expect(post.slug).toBe('how-to-merge-pdf-files');
    expect(post.title).toBeTruthy();
    expect(post.content).toBeTruthy();
  });

  test('returned post has all required fields', () => {
    const post = getPostBySlug('how-to-merge-pdf-files');
    expect(post).toHaveProperty('slug');
    expect(post).toHaveProperty('title');
    expect(post).toHaveProperty('description');
    expect(post).toHaveProperty('date');
    expect(post).toHaveProperty('content');
  });

  test('content does not include raw frontmatter', () => {
    const post = getPostBySlug('how-to-merge-pdf-files');
    // gray-matter strips frontmatter from content
    expect(post.content).not.toMatch(/^---/);
  });
});
