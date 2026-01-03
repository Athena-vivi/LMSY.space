import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const editorialDirectory = path.join(process.cwd(), 'content/editorial');

export interface ArticleMetadata {
  title: string;
  excerpt: string;
  date: string;
  category: string;
  readTime: string;
  author?: string;
  tags?: string[];
  featuredImage?: string;
}

export interface Article extends ArticleMetadata {
  slug: string;
  content: string;
}

export function getAllArticles(): Article[] {
  // Ensure directory exists
  if (!fs.existsSync(editorialDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(editorialDirectory);
  const allArticlesData = fileNames
    .filter((fileName) => fileName.endsWith('.mdx'))
    .map((fileName) => {
      const slug = fileName.replace(/\.mdx$/, '');
      const fullPath = path.join(editorialDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = matter(fileContents);

      return {
        slug,
        ...(data as ArticleMetadata),
        content,
      } as Article;
    });

  // Sort by date (newest first)
  return allArticlesData.sort((a, b) => {
    if (a.date < b.date) {
      return 1;
    } else {
      return -1;
    }
  });
}

export function getArticleBySlug(slug: string): Article | null {
  try {
    const fullPath = path.join(editorialDirectory, `${slug}.mdx`);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    return {
      slug,
      ...(data as ArticleMetadata),
      content,
    } as Article;
  } catch (error) {
    return null;
  }
}

export function getAllArticleSlugs(): string[] {
  if (!fs.existsSync(editorialDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(editorialDirectory);
  return fileNames
    .filter((fileName) => fileName.endsWith('.mdx'))
    .map((fileName) => fileName.replace(/\.mdx$/, ''));
}
