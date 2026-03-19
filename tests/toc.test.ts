import { describe, expect, it } from 'vitest'
import { extractToc, generateToc, generateTocSync } from '../src'

const SAMPLE_MARKDOWN = `# Title
## Section 1
### Sub Section 1.1
### Sub Section 1.2
## Section 2
### Sub Section 2.1
#### Deep Section
## Section 3
`

describe('toc', () => {
  describe('generateToc (async)', () => {
    it('should insert TOC at the top by default', async () => {
      const result = await generateToc(SAMPLE_MARKDOWN)
      expect(result.startsWith('## 目录')).toBe(true)
      expect(result).toContain('[Title](#title)')
      expect(result).toContain('[Section 1](#section1)')
      expect(result).toContain('[Sub Section 1.1](#subsection11)')
    })

    it('should insert TOC before first heading when position is "before-first-heading"', async () => {
      const result = await generateToc(SAMPLE_MARKDOWN, { position: 'before-first-heading' })
      expect(result.startsWith('## 目录')).toBe(true)
      expect(result).toContain('# Title')
    })

    it('should not insert TOC when position is "none"', async () => {
      const result = await generateToc(SAMPLE_MARKDOWN, { position: 'none' })
      expect(result).not.toContain('## 目录')
      expect(result).toContain('# Title')
    })

    it('should respect minDepth and maxDepth', async () => {
      const result = await generateToc(SAMPLE_MARKDOWN, { minDepth: 2, maxDepth: 3 })
      expect(result).toContain('[Section 1](#section1)')
      expect(result).toContain('[Sub Section 1.1](#subsection11)')
      expect(result).not.toContain('[Title](#title)')
      expect(result).not.toContain('[Deep Section](#deepsection)')
    })

    it('should use custom title', async () => {
      const result = await generateToc(SAMPLE_MARKDOWN, { title: 'Table of Contents', showTitle: true })
      expect(result).toContain('## Table of Contents')
    })

    it('should hide title when showTitle is false', async () => {
      const result = await generateToc(SAMPLE_MARKDOWN, { showTitle: false })
      expect(result).not.toContain('## 目录')
      expect(result).toContain('* [Section 1](#section1)')
    })

    it('should generate nested list structure', async () => {
      const result = await generateToc(SAMPLE_MARKDOWN)
      expect(result).toContain('    * [Sub Section 1.1](#subsection11)')
    })

    it('should use ordered list when listStyle is "ordered"', async () => {
      const result = await generateToc(SAMPLE_MARKDOWN, { listStyle: 'ordered' })
      expect(result).toContain('1. [Title](#title)')
      expect(result).toContain('   1. [Section 1](#section1)')
    })

    it('should omit links when withLinks is false', async () => {
      const result = await generateToc(SAMPLE_MARKDOWN, { withLinks: false })
      expect(result).toContain('* Title')
      expect(result).not.toContain('(#title)')
    })

    it('should use custom slugify function', async () => {
      const result = await generateToc(SAMPLE_MARKDOWN, {
        slugify: text => text.toUpperCase().replace(/\s/g, '_'),
      })
      expect(result).toContain('[Section 1](#SECTION_1)')
    })

    it('should handle empty markdown', async () => {
      const result = await generateToc('')
      expect(result.trim()).toBe('')
    })

    it('should handle markdown with no headings', async () => {
      const result = await generateToc('Some text without headings')
      expect(result.trim()).toBe('Some text without headings')
    })

    it('should handle Chinese characters in headings', async () => {
      const chineseMd = '# 标题\n## 章节一\n### 子章节'
      const result = await generateToc(chineseMd)
      expect(result).toContain('[标题](#标题)')
      expect(result).toContain('[章节一](#章节一)')
      expect(result).toContain('[子章节](#子章节)')
    })

    it('should handle special characters in headings', async () => {
      const specialMd = '# Test & Special <chars>\n## Section "with" quotes'
      const result = await generateToc(specialMd)
      // remark escapes < as \< in link text, slug strips < > " and spaces
      expect(result).toContain('[Test & Special \\<chars>](#testspecialchars)')
      expect(result).toContain('[Section "with" quotes](#sectionwithquotes)')
    })

    it('should handle single heading', async () => {
      const result = await generateToc('# Hello World')
      expect(result).toContain('## 目录')
      expect(result).toContain('[Hello World](#helloworld)')
    })

    it('should handle skipped heading levels', async () => {
      const skipLevels = `# H1
### H3
##### H5
`
      const result = await generateToc(skipLevels, { minDepth: 1, maxDepth: 6 })
      expect(result).toContain('[H1](#h1)')
      expect(result).toContain('[H3](#h3)')
      expect(result).toContain('[H5](#h5)')
    })
  })

  describe('generateTocSync', () => {
    it('should produce same result as async version', () => {
      const asyncResult = generateTocSync(SAMPLE_MARKDOWN)
      expect(asyncResult.startsWith('## 目录')).toBe(true)
      expect(asyncResult).toContain('[Section 1](#section1)')
    })

    it('should respect all options', () => {
      const result = generateTocSync(SAMPLE_MARKDOWN, {
        position: 'before-first-heading',
        minDepth: 3,
        maxDepth: 4,
        title: 'Custom TOC',
        showTitle: true,
        listStyle: 'ordered',
      })
      expect(result.startsWith('## Custom TOC')).toBe(true)
      expect(result).toContain('1. [Sub Section 1.1]')
      expect(result).not.toContain('[Section 1]')
    })
  })

  describe('extractToc', () => {
    it('should only return TOC without inserting into document', async () => {
      const result = await extractToc(SAMPLE_MARKDOWN)
      expect(result).not.toContain('## 目录')
      expect(result).toContain('[Title](#title)')
      expect(result).not.toContain('# Title')
    })

    it('should respect minDepth and maxDepth', async () => {
      const result = await extractToc(SAMPLE_MARKDOWN, { minDepth: 2, maxDepth: 2 })
      expect(result).toContain('[Section 1](#section1)')
      expect(result).not.toContain('[Sub Section 1.1]')
      expect(result).not.toContain('[Title]')
    })

    it('should return empty string for markdown without headings', async () => {
      const result = await extractToc('No headings here')
      expect(result).toBe('')
    })

    it('should generate nested structure', async () => {
      const result = await extractToc(SAMPLE_MARKDOWN)
      expect(result).toContain('    * [Sub Section 1.1]')
    })

    it('should use ordered list style', async () => {
      const result = await extractToc(SAMPLE_MARKDOWN, { listStyle: 'ordered' })
      expect(result).toContain('1. [Title]')
    })

    it('should omit links when withLinks is false', async () => {
      const result = await extractToc(SAMPLE_MARKDOWN, { withLinks: false })
      expect(result).toContain('* Title')
      expect(result).not.toContain('(#title)')
    })
  })
})
