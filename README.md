# markdown-toc-number

[![TypeScript](https://img.shields.io/badge/TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![npm](https://img.shields.io/npm/v/markdown-toc-number)](https://www.npmjs.com/package/markdown-toc-number)
[![npm](https://img.shields.io/npm/dm/markdown-toc-number)](https://www.npmjs.com/package/markdown-toc-number)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/ricsy/markdown-toc-number/blob/master/LICENSE)

Auto add heading numbers and generate TOC for Markdown documents

## 1. Features

- #️⃣ **Heading Numbers**: Auto add hierarchical numbers for H1~H6 (e.g. `1.`, `1.1.`, `1.1.1.`)
- 📑 **TOC Generation**: Auto extract headings and generate Markdown TOC
- ⚡ **Async/Sync**: Support both `async` and `sync` versions

## 2. Install

```bash
pnpm add markdown-toc-number
# 或
npm install markdown-toc-number
```

## 3. Usage

### 3.1 Add Heading Numbers

#### 3.1.1 `addHeadingNumbers(markdown, options?)`

```typescript
import { addHeadingNumbers } from 'markdown-toc-number'

const result = await addHeadingNumbers(`# Title
## Section 1
### Sub Section 1.1
`)
// # Title
// ## 1. Section 1
// ### 1.1. Sub Section 1.1
```

#### 3.1.2 `addHeadingNumbersSync(markdown, options?)`

```typescript
import { addHeadingNumbersSync } from 'markdown-toc-number'

const result = addHeadingNumbersSync(`# Title
## Section 1
`)
```

#### 3.1.3 HeadingNumberOptions

| Option                     | Type               | Default       | Description                          |
| -------------------------- | ------------------ | ------------- | ------------------------------------ |
| `resetPerFile`             | `boolean`          | `true`        | Reset counters per file              |
| `separator`                | `string`           | `'. '`        | Separator between number and heading |
| `startFromLevel`           | `number`           | `2`           | Start numbering from level (1-6)     |
| `cleanupExistingNumbers`   | `boolean`          | `true`        | Cleanup existing numbers             |
| `existingSeparatorPattern` | `string \| RegExp` | `'[.、\\s]+'` | Pattern for existing numbers         |

**Example**:

```typescript
// Start numbering from H1
await addHeadingNumbers(markdown, {
  startFromLevel: 1,
})
// # 1. Title
// ## 1.1. Section 1
```

### 3.2 TOC Generation

#### 3.2.1 `generateToc(markdown, options?)`

Insert TOC at the top of the document

```typescript
import { generateToc } from 'markdown-toc-number'

const result = await generateToc(`# Title
## Section 1
### Sub Section
`)
// ## Table of Contents
// * [Title](#title)
//   * [Section 1](#section1)
//     * [Sub Section](#subsection)
```

#### 3.2.2 `generateTocSync(markdown, options?)`

#### 3.2.3 `extractToc(markdown, options?)`

Return TOC only, without inserting into the document

```typescript
const toc = await extractToc(markdown)
// Returns TOC content only
```

#### 3.2.4 TocOptions

| Option      | Type                                        | Default       | Description                     |
| ----------- | ------------------------------------------- | ------------- | ------------------------------- |
| `maxDepth`  | `number`                                    | `6`           | Maximum heading depth (1-6)     |
| `minDepth`  | `number`                                    | `1`           | Minimum heading depth (1-6)     |
| `title`     | `string`                                    | `'目录'`      | TOC title                       |
| `showTitle` | `boolean`                                   | `true`        | Show TOC title                  |
| `position`  | `'top' \| 'before-first-heading' \| 'none'` | `'top'`       | TOC insertion position          |
| `withLinks` | `boolean`                                   | `true`        | Include anchor links            |
| `slugify`   | `(text: string) => string`                  | default fn    | Custom anchor generation        |
| `listStyle` | `'unordered' \| 'ordered'`                  | `'unordered'` | List style                      |
| `tight`     | `boolean`                                   | `false`       | Tight mode (remove blank lines) |

**Example**:

```typescript
// Generate ordered TOC with depth 2-4
await generateToc(markdown, {
  listStyle: 'ordered',
  minDepth: 2,
  maxDepth: 4,
  title: 'Table of Contents',
})

// Custom anchor generation
await generateToc(markdown, {
  slugify: text => text.toUpperCase().replace(/\s/g, '_'),
})
```
