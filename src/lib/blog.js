/**
 * blog.js – Blog post loader utility
 * Reads MDX files from src/app/blog/posts/ and returns metadata + content.
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const POSTS_DIR = path.join(process.cwd(), 'src', 'app', 'blog', 'posts');

export function getAllPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
  return files
    .map(file => {
      const slug = file.replace(/\.mdx$/, '');
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
      const { data, content } = matter(raw);
      return {
        slug,
        title: data.title || slug,
        description: data.description || '',
        date: data.date || '',
        readTime: data.readTime || '',
        category: data.category || 'Guide',
        content,
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

const SLUG_REGEX = /^[a-z0-9-]+$/i;

export function getPostBySlug(slug) {
  if (typeof slug !== 'string' || !SLUG_REGEX.test(slug)) return null;
  const postsRoot = path.resolve(POSTS_DIR);
  const filePath = path.resolve(postsRoot, `${slug}.mdx`);
  if (!filePath.startsWith(postsRoot + path.sep)) return null;
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);
  return {
    slug,
    title: data.title || slug,
    description: data.description || '',
    date: data.date || '',
    readTime: data.readTime || '',
    category: data.category || 'Guide',
    content,
  };
}
