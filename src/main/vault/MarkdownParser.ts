import matter from 'gray-matter';

export class MarkdownParser {
  /**
   * Extract YAML frontmatter from markdown content
   * Returns parsed object or empty object if no frontmatter
   */
  extractFrontmatter(content: string): Record<string, any> {
    try {
      const { data } = matter(content);
      return data || {};
    } catch (error) {
      console.error('Failed to parse frontmatter:', error);
      return {};
    }
  }

  /**
   * Extract just the body content (no frontmatter)
   */
  extractBody(content: string): string {
    try {
      const { content: body } = matter(content);
      return body;
    } catch (error) {
      console.error('Failed to parse markdown:', error);
      return content;
    }
  }

  /**
   * Get both frontmatter and body
   */
  parse(content: string): { frontmatter: Record<string, any>; body: string } {
    try {
      const { data, content: body } = matter(content);
      return {
        frontmatter: data || {},
        body,
      };
    } catch (error) {
      console.error('Failed to parse markdown:', error);
      return {
        frontmatter: {},
        body: content,
      };
    }
  }
}

// Singleton instance
export const markdownParser = new MarkdownParser();
