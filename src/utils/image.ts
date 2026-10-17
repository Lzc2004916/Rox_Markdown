/**
 * 插入图片相关的校验与路径工具
 */

/** 支持的图片扩展名（小写，不含点） */
export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] as const

/** 用户可读的格式说明，用于错误提示 */
export const IMAGE_EXTENSIONS_LABEL = 'png / jpg / jpeg / gif / webp / svg'

/** Windows 反斜杠路径统一为正斜杠，便于写入 Markdown 与 URL 编码 */
export function normalizeImagePath(p: string): string {
  return p.replace(/\\/g, '/')
}

/** 取扩展名（小写，不含点）；无扩展名返回空串 */
export function getImageExtension(p: string): string {
  const clean = p.split(/[?#]/)[0] ?? ''
  const idx = clean.lastIndexOf('.')
  if (idx < 0) return ''
  return clean.slice(idx + 1).toLowerCase()
}

/** 是否受支持的图片地址（本地路径 / http(s) / data URL） */
export function isSupportedImage(src: string): boolean {
  if (!src) return false
  if (/^data:image\//i.test(src)) return true
  if (/^https?:\/\//i.test(src)) return true
  return (IMAGE_EXTENSIONS as readonly string[]).includes(getImageExtension(src))
}
