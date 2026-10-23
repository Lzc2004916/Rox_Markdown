// 图片 markdown 语法解析与改写工具。
// 图片块语法（单行）：![alt](src){#img1}{height=200}
//   - {#img1}  图片唯一标识 key（无则视为老图，不出现在滑块面板）
//   - {height=200} 图片高度，px

export interface ImageMarkdownItem {
  key: string
  alt: string
  src: string
  height: number
  /** 整行原文 */
  raw: string
  /** 行号（从 0 开始） */
  lineIndex: number
}

/** 默认图片高度（px），与 layout.ts 里解析图片时的默认值保持一致 */
export const DEFAULT_IMAGE_HEIGHT = 200

export interface ParsedImageMarkdownLine {
  alt: string
  src: string
  attrs: string
}

/**
 * Parse a standalone Markdown image line.
 *
 * The URL capture is deliberately greedy: a local Windows filename can
 * legitimately include parentheses (for example `photo (5).png`). The closing
 * parenthesis for the Markdown link is therefore the final one before attrs.
 */
export function parseImageMarkdownLine(line: string): ParsedImageMarkdownLine | null {
  const match = line.trim().match(/^!\[([^\]]*)\]\((.+)\)((?:\s*\{[^{}]*\})*)$/)
  if (!match) return null
  return { alt: match[1] ?? '', src: match[2] ?? '', attrs: match[3] ?? '' }
}

/** Parse the second line of the legacy two-line image syntax. */
export function parseImageUrlLine(line: string): { src: string; attrs: string } | null {
  const match = line.trim().match(/^\(\s*(.+)\)((?:\s*\{[^{}]*\})*)$/)
  if (!match) return null
  return { src: match[1]!.trim(), attrs: match[2] ?? '' }
}

/** 解析 {#img1}{height=200} 这类尾部属性串，顺序无关 */
export function parseImageAttrs(tail: string): { height?: number; key?: string } {
  const out: { height?: number; key?: string } = {}
  const re = /\{([^{}]+)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(tail))) {
    const attr = m[1]!.trim()
    if (attr.startsWith('#')) {
      out.key = attr.slice(1)
    } else if (attr.startsWith('height=')) {
      const h = Number.parseInt(attr.slice('height='.length), 10)
      if (!Number.isNaN(h)) out.height = h
    }
  }
  return out
}

/** 扫描 markdown 源文本，返回所有带 key 的图片项 */
export function parseImages(source: string): ImageMarkdownItem[] {
  const items: ImageMarkdownItem[] = []
  const lines = source.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const image = parseImageMarkdownLine(lines[i]!)
    if (!image) continue
    const attrs = parseImageAttrs(image.attrs)
    if (!attrs.key) continue
    items.push({
      key: attrs.key,
      alt: image.alt,
      src: image.src,
      height: attrs.height ?? DEFAULT_IMAGE_HEIGHT,
      raw: lines[i]!,
      lineIndex: i,
    })
  }
  return items
}

/** 把指定 key 的图片高度改写为 newHeight，返回新源文本；找不到则原样返回 */
export function setImageHeight(source: string, key: string, newHeight: number): string {
  const lines = source.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim()
    const image = parseImageMarkdownLine(trimmed)
    if (!image) continue
    const attrs = parseImageAttrs(image.attrs)
    if (attrs.key !== key) continue
    const indent = lines[i]!.match(/^\s*/)![0]
    lines[i] = `${indent}![${image.alt}](${image.src}){#${key}}{height=${newHeight}}`
    break
  }
  return lines.join('\n')
}

/** 生成下一个可用的图片 key（img1、img2…），基于现有 markdown 里的最大编号 +1 */
export function nextImageKey(source: string): string {
  let max = 0
  const re = /\{#img(\d+)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(source))) {
    const n = Number.parseInt(m[1]!, 10)
    if (!Number.isNaN(n) && n > max) max = n
  }
  return `img${max + 1}`
}

