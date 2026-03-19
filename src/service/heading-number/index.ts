import type { Heading, Root, Text } from 'mdast'
import { toString } from 'mdast-util-to-string'
import { remark } from 'remark'
import { visit } from 'unist-util-visit'

export interface HeadingNumberOptions {
  /** 是否在每个文件重置计数器（默认: true） */
  resetPerFile?: boolean
  /** 新序号与标题之间的分隔符（默认: '. '） */
  separator?: string
  /** 从哪级标题开始编号（1-6，默认: 1） */
  startFromLevel?: number
  /** 是否清理已存在的编号（默认: true） */
  cleanupExistingNumbers?: boolean
  /** 已存在序号的分隔符正则（用于识别和清理），默认匹配 '. ' 和 '、' */
  existingSeparatorPattern?: string | RegExp
}

/**
 * 处理函数参数，确保所有选项都有默认值
 */
function resolveOptions(options: HeadingNumberOptions = {}): Required<HeadingNumberOptions> {
  return {
    resetPerFile: true,
    separator: '. ',
    startFromLevel: 1,
    cleanupExistingNumbers: true,
    existingSeparatorPattern: '[.、\\s]+',
    ...options,
  }
}

/**
 * 清理标题中已存在的数字序号
 * 例如: "1. 标题" -> "标题", "1.1、标题" -> "标题"
 */
function cleanupExistingNumber(
  node: Heading,
  originalText: string,
  separatorPattern: string | RegExp,
): { cleanedText: string, hadNumber: boolean } {
  const separator = typeof separatorPattern === 'string'
    ? separatorPattern
    : separatorPattern.source

  const existingNumberRegex = new RegExp(
    `^(\\d+(?:\\.\\d+)*\\.?)${separator}`,
  )

  const match = originalText.match(existingNumberRegex)

  if (!match) {
    return { cleanedText: originalText, hadNumber: false }
  }

  const cleanedText = originalText.substring(match[0].length)

  // 更新节点中的文本
  if (node.children[0]?.type === 'text') {
    node.children[0].value = cleanedText
  }

  return { cleanedText, hadNumber: true }
}

/**
 * 更新层级计数器
 * 重置更低层级的计数器，然后递增当前层级
 */
function updateLevelCounters(
  level: number,
  counters: number[],
  previousLevel: number,
): { counters: number[], previousLevel: number } {
  if (level < previousLevel) {
    // 返回到更高级别（数字更小）：重置更深层级的计数器，保留当前及更高层级
    for (let i = level; i < 6; i++) {
      counters[i] = 0
    }
  }
  else if (level === previousLevel) {
    // 同级标题：不重置任何计数器，只递增当前层级
  }
  else {
    // 进入更深层级（数字更大）：只重置更低层级的计数器
    for (let i = level; i < 6; i++) {
      counters[i] = 0
    }
  }

  // 当前层级计数器加1
  counters[level - 1]++
  previousLevel = level

  return { counters, previousLevel }
}

/**
 * 构建章节序号
 * 只包含已使用的层级，过滤首尾 0
 */
function buildSectionNumber(level: number, counters: number[]): string {
  // 找到最高使用过的层级
  let maxUsed = 0
  for (let i = 0; i <= level; i++) {
    if (counters[i] > 0)
      maxUsed = i
  }

  const numberParts: number[] = []
  for (let i = 0; i <= maxUsed; i++) {
    numberParts.push(counters[i] || 0)
  }

  // 去掉首尾 0
  while (numberParts.length > 1 && numberParts[0] === 0) {
    numberParts.shift()
  }
  while (numberParts.length > 1 && numberParts[numberParts.length - 1] === 0) {
    numberParts.pop()
  }

  return numberParts.join('.')
}

/**
 * 检查文本是否已经包含指定格式的序号
 */
function hasNumberPattern(text: string, separator: string): boolean {
  // 转义特殊字符用于正则表达式
  const escapedSeparator = separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`^\\d+(?:\\.\\d+)*\\.?${escapedSeparator}`)
  return pattern.test(text)
}

/**
 * 创建带有序号的文本节点
 */
function createNumberedTextNode(
  sectionNumber: string,
  separator: string,
  originalText: string,
): Text {
  return {
    type: 'text',
    value: `${sectionNumber}${separator}${originalText}`,
  }
}

/**
 * 处理单个标题节点的核心逻辑
 */
function processHeadingNode(
  node: Heading,
  counters: number[],
  previousLevel: number,
  options: Required<HeadingNumberOptions>,
): number {
  const { startFromLevel, cleanupExistingNumbers, existingSeparatorPattern, separator } = options
  const level = node.depth
  let originalText = toString(node)

  // 清理已存在的编号
  if (cleanupExistingNumbers) {
    const { cleanedText } = cleanupExistingNumber(node, originalText, existingSeparatorPattern)
    originalText = cleanedText
  }

  // 如果当前标题级别小于起始级别，不编号
  if (level < startFromLevel) {
    return previousLevel
  }

  // 更新计数器
  const result = updateLevelCounters(level, counters, previousLevel)

  // 构建序号
  const sectionNumber = buildSectionNumber(level, result.counters)

  // 避免重复添加序号
  if (!hasNumberPattern(originalText, separator)) {
    const newTextNode = createNumberedTextNode(sectionNumber, separator, originalText)
    node.children = [newTextNode]
  }

  return result.previousLevel
}

/**
 * 创建 remark 插件来处理标题编号
 */
function createHeadingNumberPlugin(options: Required<HeadingNumberOptions>) {
  return () => {
    const counters: number[] = Array.from<number>({ length: 6 }).fill(0)
    let previousLevel = 0

    return function transformer(tree: Root) {
      // 如果重置计数器
      if (options.resetPerFile) {
        counters.fill(0)
        previousLevel = 0
      }

      visit(tree, 'heading', (node: Heading) => {
        previousLevel = processHeadingNode(node, counters, previousLevel, options)
      })
    }
  }
}

/**
 * 为 Markdown AST 中的标题节点添加自动序号
 * @param markdownText - 原始 Markdown 文本
 * @param options - 配置选项
 * @returns 添加了序号的 Markdown 文本
 */
export async function addHeadingNumbers(
  markdownText: string,
  options: HeadingNumberOptions = {},
): Promise<string> {
  const resolvedOptions = resolveOptions(options)

  // 创建 remark 处理器并应用插件
  const processor = remark()
    .use(createHeadingNumberPlugin(resolvedOptions))

  // 处理 Markdown
  const result = await processor.process(markdownText)
  return result.toString()
}

/**
 * 同步版本
 */
export function addHeadingNumbersSync(
  markdownText: string,
  options: HeadingNumberOptions = {},
): string {
  const resolvedOptions = resolveOptions(options)
  const counters: number[] = Array.from<number>({ length: 6 }).fill(0)
  let previousLevel = 0

  const processor = remark()
    .use(() => {
      return function transformer(tree: Root) {
        if (resolvedOptions.resetPerFile) {
          counters.fill(0)
          previousLevel = 0
        }

        visit(tree, 'heading', (node: Heading) => {
          previousLevel = processHeadingNode(node, counters, previousLevel, resolvedOptions)
        })
      }
    })

  return processor.processSync(markdownText).toString()
}
