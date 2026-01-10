import { describe, it, expect } from 'vitest';
import { MarkdownParser } from '@main/vault/MarkdownParser';

describe('MarkdownParser', () => {
  const parser = new MarkdownParser();

  it('extracts valid YAML frontmatter', () => {
    const content = `---
Status: Active
Species: Human
Age: 34
---

# Lydia Ashworth

Queen of Heartwater.`;

    const result = parser.extractFrontmatter(content);

    expect(result).toEqual({
      Status: 'Active',
      Species: 'Human',
      Age: 34,
    });
  });

  it('CRITICAL: returns empty object for files without frontmatter', () => {
    const content = '# Just a heading\n\nSome content.';

    const result = parser.extractFrontmatter(content);

    expect(result).toEqual({});
  });

  it('CRITICAL: handles malformed YAML gracefully', () => {
    const content = `---
Status: Active
  bad indentation:
    - broken
  Species: Human
---

Content here.`;

    const result = parser.extractFrontmatter(content);

    // Should return {} instead of throwing
    expect(result).toEqual({});
  });

  it('handles empty files', () => {
    const result = parser.extractFrontmatter('');

    expect(result).toEqual({});
  });

  it('extracts body without frontmatter', () => {
    const content = `---
Status: Active
---

# Heading

Body content here.`;

    const body = parser.extractBody(content);

    expect(body.trim()).toBe('# Heading\n\nBody content here.');
  });

  it('parse() returns both frontmatter and body', () => {
    const content = `---
key: value
---

Body text.`;

    const result = parser.parse(content);

    expect(result).toEqual({
      frontmatter: { key: 'value' },
      body: '\nBody text.',
    });
  });
});
