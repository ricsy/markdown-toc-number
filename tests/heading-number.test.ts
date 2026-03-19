import { describe, expect, it } from 'vitest'
import { addHeadingNumbers, addHeadingNumbersSync } from '../src'

const SAMPLE_MARKDOWN = `# Title
## Section 1
### Sub Section 1.1
### Sub Section 1.2
## Section 2
### Sub Section 2.1
#### Deep Section
## Section 3
`

describe('heading-number', () => {
  describe('addHeadingNumbers (async)', () => {
    it('should add numbers to all headings by default', async () => {
      const result = await addHeadingNumbers(SAMPLE_MARKDOWN)
      expect(result).toContain('# 1. Title')
      expect(result).toContain('## 1.1. Section 1')
      expect(result).toContain('### 1.1.1. Sub Section 1.1')
      expect(result).toContain('### 1.1.2. Sub Section 1.2')
      expect(result).toContain('## 1.2. Section 2')
      expect(result).toContain('### 1.2.1. Sub Section 2.1')
      expect(result).toContain('#### 1.2.1.1. Deep Section')
      expect(result).toContain('## 1.3. Section 3')
    })

    it('should respect startFromLevel option', async () => {
      const result = await addHeadingNumbers(SAMPLE_MARKDOWN, { startFromLevel: 2 })
      expect(result).not.toContain('# 1. Title')
      expect(result).toContain('## 1. Section 1')
      expect(result).toContain('### 1.1. Sub Section 1.1')
    })

    it('should use custom separator', async () => {
      const result = await addHeadingNumbers(SAMPLE_MARKDOWN, { separator: ' - ' })
      expect(result).toContain('# 1 - Title')
      expect(result).toContain('## 1.1 - Section 1')
      expect(result).toContain('### 1.1.1 - Sub Section 1.1')
    })

    it('should reset counters per file by default', async () => {
      const multiFile = `# File A
## Section
### Sub

# File B
## Section
### Sub
`
      const result = await addHeadingNumbers(multiFile)
      const sections = result.match(/## \d+\.\d+\. Section/g)
      // With resetPerFile=true, counters reset at document start only.
      // File B's section continues from File A, so it's ## 2.1.
      expect(sections).toEqual(['## 1.1. Section', '## 2.1. Section'])
    })

    it('should not reset counters when resetPerFile is false', async () => {
      const multiFile = `# File A
## Section
### Sub

# File B
## Section
### Sub
`
      const result = await addHeadingNumbers(multiFile, { resetPerFile: false })
      const sections = result.match(/## \d+\.\d+\. Section/g)
      // With resetPerFile=false, counters never reset across the document.
      expect(sections).toEqual(['## 1.1. Section', '## 2.1. Section'])
    })

    it('should clean up existing numbers', async () => {
      const withExisting = `# 1. Old Title
## 2.1. Old Section
### Old Sub
`
      const result = await addHeadingNumbers(withExisting)
      expect(result).toContain('# 1. Old Title')
      expect(result).toContain('## 1.1. Old Section')
      expect(result).toContain('### 1.1.1. Old Sub')
    })

    it('should not duplicate numbers if already present', async () => {
      const withNumbers = `# 1. Title
## 1.1. Section
`
      const result = await addHeadingNumbers(withNumbers)
      const count = (result.match(/1\.1\. Section/g) || []).length
      expect(count).toBe(1)
    })

    it('should handle empty markdown', async () => {
      const result = await addHeadingNumbers('')
      expect(result.trim()).toBe('')
    })

    it('should handle markdown with no headings', async () => {
      const result = await addHeadingNumbers('Some text without headings')
      expect(result.trim()).toBe('Some text without headings')
    })

    it('should handle single heading', async () => {
      const result = await addHeadingNumbers('# Hello')
      expect(result).toContain('# 1. Hello')
    })

    it('should handle headings with special characters', async () => {
      const result = await addHeadingNumbers('# 你好世界\n## Test & Special')
      expect(result).toContain('# 1. 你好世界')
      expect(result).toContain('## 1.1. Test & Special')
    })
  })

  describe('addHeadingNumbersSync', () => {
    it('should produce same result as async version', () => {
      const asyncResult = addHeadingNumbersSync(SAMPLE_MARKDOWN)
      expect(asyncResult).toContain('# 1. Title')
      expect(asyncResult).toContain('## 1.1. Section 1')
    })

    it('should respect all options', () => {
      const result = addHeadingNumbersSync(SAMPLE_MARKDOWN, {
        startFromLevel: 3,
        separator: ' | ',
        resetPerFile: false,
      })
      expect(result).not.toContain('# 1.')
      expect(result).not.toContain('## 1.')
      expect(result).toContain('### 1 | Sub Section 1.1')
    })
  })
})
