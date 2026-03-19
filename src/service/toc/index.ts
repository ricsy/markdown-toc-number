import type { Heading, Link, List, ListItem, Paragraph, Root } from 'mdast'
import { toString } from 'mdast-util-to-string'
import { remark } from 'remark'
import { visit } from 'unist-util-visit'

export interface TocOptions {
  /** 目录的最大深度（默认: 6，对应 h1-h6） */
  maxDepth?: number
  /** 目录的最小深度（默认: 1，从 h1 开始） */
  minDepth?: number
  /** 目录标题文本（默认: '目录'） */
  title?: string
  /** 是否显示标题（默认: true） */
  showTitle?: boolean
  /** 目录位置：'top' | 'before-first-heading' | 不添加自动位置（默认: 'top'） */
  position?: 'top' | 'before-first-heading' | 'none'
  /** 是否包含锚点链接（默认: true） */
  withLinks?: boolean
  /** 自定义锚点生成函数 */
  slugify?: (text: string) => string
  /** 列表样式：'unordered' | 'ordered'（默认: 'unordered'） */
  listStyle?: 'unordered' | 'ordered'
  /** 是否紧凑模式（移除空行，默认: false） */
  tight?: boolean
}

// 自定义类型定义
interface CustomHeadingData {
  hProperties?: Record<string, any>
  [key: string]: any
}

// 类型断言辅助函数
function getHeadingData(node: Heading): CustomHeadingData {
  if (!node.data) {
    node.data = {}
  }
  return node.data as CustomHeadingData
}

/**
 * 处理函数参数，确保所有选项都有默认值
 */
function resolveTocOptions(options: TocOptions = {}): Required<TocOptions> {
  return {
    maxDepth: 6,
    minDepth: 1,
    title: '目录',
    showTitle: true,
    position: 'top',
    withLinks: true,
    slugify: defaultSlugify,
    listStyle: 'unordered',
    tight: false,
    ...options,
  }
}

/**
 * 默认的锚点生成函数
 * 将文本转换为 URL 友好的 slug
 */
function defaultSlugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4E00-\u9FA5-]/g, '') // 保留字母、数字、汉字、汉字扩展和连字符
    .replace(/-+/g, '-') // 合并多个连字符
    .replace(/^-|-$/g, '') // 移除开头和结尾的连字符
}

/**
 * 获取标题的层级信息
 */
function getHeadingInfo(heading: Heading, slugify: (text: string) => string): {
  level: number
  text: string
  id: string
} {
  const level = heading.depth
  const text = toString(heading)
  const id = slugify(text)

  return { level, text, id }
}

/**
 * 创建目录项节点
 */
function createTocItem(
  headingInfo: { level: number, text: string, id: string },
  options: Required<TocOptions>,
): ListItem {
  const { withLinks } = options

  let contentNode: Paragraph
  if (withLinks) {
    const linkNode: Link = {
      type: 'link',
      url: `#${headingInfo.id}`,
      children: [{ type: 'text', value: headingInfo.text }],
    }
    contentNode = {
      type: 'paragraph',
      children: [linkNode],
    }
  }
  else {
    contentNode = {
      type: 'paragraph',
      children: [{ type: 'text', value: headingInfo.text }],
    }
  }

  return {
    type: 'listItem',
    spread: false,
    children: [contentNode],
  }
}

/**
 * 节点树结构
 */
interface TocNode { level: number, text: string, id: string, children: TocNode[] }

/**
 * 构建嵌套的目录结构
 */
function buildNestedTocList(
  headings: Array<{ level: number, text: string, id: string }>,
  options: Required<TocOptions>,
): List {
  const { listStyle, tight } = options

  // 过滤有效标题
  const filtered = headings.filter(h => h.level >= options.minDepth && h.level <= options.maxDepth)
  if (filtered.length === 0) {
    return { type: 'list', ordered: false, spread: !tight, children: [] }
  }

  // 构建树结构
  const root: TocNode = { level: 0, text: '', id: '', children: [] }
  const stack: TocNode[] = [root]

  for (const h of filtered) {
    const node: TocNode = { ...h, children: [] }

    while (stack.length > 1 && stack[stack.length - 1].level >= h.level) {
      stack.pop()
    }

    stack[stack.length - 1].children.push(node)
    stack.push(node)
  }

  // 递归构建 mdast List：每个 ListItem 的 children 包含 [Paragraph, List?]
  function buildList(nodes: TocNode[], ordered: boolean): List {
    return {
      type: 'list',
      ordered,
      spread: !tight,
      children: nodes.map((node) => {
        const itemChildren: (Paragraph | List)[] = [
          createTocItem(node, options).children[0] as Paragraph,
        ]

        if (node.children.length > 0) {
          itemChildren.push(buildList(node.children, ordered))
        }

        return {
          type: 'listItem',
          spread: false,
          children: itemChildren,
        }
      }),
    }
  }

  return buildList(root.children, listStyle === 'ordered')
}

/**
 * 创建目录标题节点
 */
function createTocTitle(title: string): Heading {
  return {
    type: 'heading',
    depth: 2, // 默认使用 h2
    children: [{ type: 'text', value: title }],
  }
}

/**
 * 创建完整的目录节点
 */
function createTocNode(headings: Heading[], options: Required<TocOptions>): (Heading | List)[] {
  const nodes: (Heading | List)[] = []

  // 添加标题
  if (options.showTitle) {
    nodes.push(createTocTitle(options.title))
  }

  // 提取并处理标题信息
  const headingInfos = headings
    .map(heading => getHeadingInfo(heading, options.slugify))

  // 构建目录列表
  if (headingInfos.length > 0) {
    const list = buildNestedTocList(headingInfos, options)
    if (list.children.length > 0) {
      nodes.push(list)
    }
  }

  return nodes
}

/**
 * 在文档中查找标题位置
 */
function findFirstHeadingPosition(tree: Root): number {
  let position = -1

  visit(tree, (node, index) => {
    if (position === -1 && node.type === 'heading') {
      position = index as number
    }
  })

  return position
}

/**
 * 为标题添加 ID 属性
 */
function addHeadingIds(tree: Root, slugify: (text: string) => string): void {
  visit(tree, 'heading', (node: Heading) => {
    const text = toString(node)
    const id = slugify(text)

    // 使用类型安全的方式处理
    const data = getHeadingData(node)

    if (!data.hProperties) {
      data.hProperties = {}
    }

    data.hProperties.id = id
  })
}

/**
 * 创建 TOC 生成插件
 */
function createTocPlugin(options: Required<TocOptions>) {
  return () => {
    return function transformer(tree: Root) {
      // 收集所有标题
      const headings: Heading[] = []
      visit(tree, 'heading', (node: Heading) => {
        headings.push({ ...node })
      })

      if (headings.length === 0) {
        return // 没有标题，不生成目录
      }

      // 为标题添加 ID
      addHeadingIds(tree, options.slugify)

      // 创建目录节点
      const tocNodes = createTocNode(headings, options)

      if (options.position === 'none') {
        return // 不自动插入目录
      }

      // 确定插入位置
      let insertIndex = 0
      if (options.position === 'before-first-heading') {
        const firstHeadingIndex = findFirstHeadingPosition(tree)
        if (firstHeadingIndex !== -1) {
          insertIndex = firstHeadingIndex
        }
      }

      // 插入目录
      tree.children.splice(insertIndex, 0, ...tocNodes)
    }
  }
}

/**
 * 为 Markdown 文档生成目录
 * @param markdownText - 原始 Markdown 文本
 * @param options - 配置选项
 * @returns 添加了目录的 Markdown 文本
 */
export async function generateToc(
  markdownText: string,
  options: TocOptions = {},
): Promise<string> {
  const resolvedOptions = resolveTocOptions(options)

  // 创建 remark 处理器并应用插件
  const processor = remark()
    .use(createTocPlugin(resolvedOptions))

  // 处理 Markdown
  const result = await processor.process(markdownText)
  return result.toString()
}

/**
 * 同步版本
 */
export function generateTocSync(
  markdownText: string,
  options: TocOptions = {},
): string {
  const resolvedOptions = resolveTocOptions(options)

  const processor = remark()
    .use(createTocPlugin(resolvedOptions))

  return processor.processSync(markdownText).toString()
}

/**
 * 仅生成目录（不插入文档）
 * @param markdownText - 原始 Markdown 文本
 * @param options - 配置选项
 * @returns 目录的 Markdown 文本
 */
export async function extractToc(
  markdownText: string,
  options: Omit<TocOptions, 'position' | 'showTitle'> = {},
): Promise<string> {
  const resolvedOptions: Required<TocOptions> = {
    ...resolveTocOptions(options),
    position: 'none',
    showTitle: false,
  }

  const processor = remark()
  const tree = processor.parse(markdownText)

  // 收集所有标题
  const headings: Heading[] = []
  visit(tree, 'heading', (node: Heading) => {
    headings.push({ ...node })
  })

  if (headings.length === 0) {
    return '' // 没有标题
  }

  // 创建目录节点
  const tocNodes = createTocNode(headings, resolvedOptions)

  // 将目录节点转换为字符串
  const tocTree: Root = {
    type: 'root',
    children: tocNodes,
  }

  return processor.stringify(tocTree)
}
