/**
 * Markdown utility functions (M9)
 */

/**
 * Check if content has YAML frontmatter
 * Frontmatter must start with `---` at the beginning of the file
 */
export function hasFrontmatter(content: string): boolean {
  // Match frontmatter: starts with ---, optional whitespace before
  const frontmatterRegex = /^\s*---\s*\n/;
  return frontmatterRegex.test(content);
}

/**
 * Prepend minimal frontmatter to content
 * Returns content with frontmatter added at the top
 */
export function prependFrontmatter(content: string): string {
  const frontmatter = '---\n---\n';
  return frontmatter + content;
}
