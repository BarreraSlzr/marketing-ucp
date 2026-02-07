import fs from "fs";
import path from "path";
import matter from "gray-matter";

const docsDirectory = path.join(process.cwd(), "docs");

export interface DocMetadata {
  title: string;
  description?: string;
  slug: string;
  fileName: string;
}

export interface DocContent extends DocMetadata {
  content: string;
  rawContent: string;
}

/**
 * Get all markdown files from the docs directory
 */
export function getAllDocs(): DocMetadata[] {
  const fileNames = fs.readdirSync(docsDirectory);
  
  const docs = fileNames
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, "");
      const fullPath = path.join(docsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      const { data } = matter(fileContents);

      // Extract title from frontmatter or first h1
      const title = data.title || extractTitle(fileContents) || slug;

      return {
        slug,
        fileName,
        title,
        description: data.description,
      };
    })
    .sort((a, b) => {
      // Sort by priority if available, then alphabetically
      const priorityOrder = [
        "development-status",
        "architecture",
        "entities",
        "workflows",
        "demo-guide",
      ];
      const aIndex = priorityOrder.indexOf(a.slug);
      const bIndex = priorityOrder.indexOf(b.slug);
      
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      
      return a.title.localeCompare(b.title);
    });

  return docs;
}

/**
 * Get a single document by slug
 */
export function getDocBySlug(slug: string): DocContent | null {
  try {
    const fullPath = path.join(docsDirectory, `${slug}.md`);
    const fileContents = fs.readFileSync(fullPath, "utf8");
    const { data, content } = matter(fileContents);

    const title = data.title || extractTitle(fileContents) || slug;

    return {
      slug,
      fileName: `${slug}.md`,
      title,
      description: data.description,
      content,
      rawContent: fileContents,
    };
  } catch {
    return null;
  }
}

/**
 * Extract title from markdown content (first h1)
 */
function extractTitle(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1] : null;
}

/**
 * Check if a slug exists
 */
export function docExists(slug: string): boolean {
  const fullPath = path.join(docsDirectory, `${slug}.md`);
  return fs.existsSync(fullPath);
}
