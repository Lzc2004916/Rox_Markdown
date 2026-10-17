/**
 * 卡片引擎的图片加载缓存。
 *
 * 渲染管线是同步的（renderCard 直接 drawImage），所以图片必须在渲染前
 * 通过 preloadImages 预加载进缓存；renderer 里用 getLoadedImage 同步取图。
 *
 * 本地绝对路径统一转成 rox-image:// 自定义协议 URL（Electron 主进程
 * protocol.handle 里映射回本地文件）；取二进制后转 blob URL 再解码，
 * 避免跨源绘制污染 canvas（否则导出 toDataURL 会抛错）。
 */

import type { Block, ImageBlock } from './types'

export type ImageStatus = 'loading' | 'loaded' | 'error'

interface CacheEntry {
  status: ImageStatus
  img: HTMLImageElement | null
}

const cache = new Map<string, CacheEntry>()

/** 把 markdown 里的图片地址转成渲染可用的 URL */
export function toRenderableUrl(src: string): string {
  if (/^(https?:|data:|blob:|rox-image:)/i.test(src)) return src
  // 本地绝对路径（Windows 盘符 / UNC / POSIX）：正斜杠化后整体编码
  const normalized = src.replace(/\\/g, '/')
  return 'rox-image://image/' + encodeURIComponent(normalized)
}

/** 同步取已加载完成的图片；未就绪返回 null */
export function getLoadedImage(src: string): HTMLImageElement | null {
  const entry = cache.get(src)
  return entry?.status === 'loaded' ? entry.img : null
}

/** 查询加载状态（未开始返回 'idle'） */
export function getImageStatus(src: string): ImageStatus | 'idle' {
  return cache.get(src)?.status ?? 'idle'
}

/**
 * 预加载一组图片地址。全部 settle 后返回，单图失败/超时不阻塞其他图片。
 */
export async function preloadImages(srcs: string[], timeoutMs = 10_000): Promise<void> {
  const unique = [...new Set(srcs.filter(Boolean))]
  await Promise.all(
    unique.map(async (src) => {
      const existing = cache.get(src)
      // 已加载或加载中：跳过；失败的允许重试一次（文件可能刚保存好）
      if (existing && existing.status !== 'error') return
      const entry: CacheEntry = { status: 'loading', img: null }
      cache.set(src, entry)
      try {
        entry.img = await loadOne(src, timeoutMs)
        entry.status = 'loaded'
      } catch {
        entry.status = 'error'
      }
    }),
  )
}

/** 从排版结果里收集所有图片块的 src */
export function collectImageSrcs(pages: { blocks: Block[] }[]): string[] {
  const srcs: string[] = []
  for (const page of pages) {
    for (const block of page.blocks) {
      if (block.kind === 'image') {
        srcs.push((block as ImageBlock).src)
      }
    }
  }
  return srcs
}

async function loadOne(src: string, timeoutMs: number): Promise<HTMLImageElement> {
  const url = toRenderableUrl(src)

  const task = (async (): Promise<HTMLImageElement> => {
    // data/blob URL 直接解码；http(s) 远程图也直接加载（保持原行为）
    if (/^(data:|blob:|https?:)/i.test(url)) {
      return loadImageElement(url)
    }
    // rox-image:// 本地文件：fetch 二进制 → blob URL → 解码。
    // blob URL 与页面同源，drawImage 不会污染 canvas，导出不受影响。
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    try {
      return await loadImageElement(objectUrl)
    } finally {
      // 解码完成后即可释放，bitmap 已归 Image 所有
      URL.revokeObjectURL(objectUrl)
    }
  })()

  return Promise.race([
    task,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('image load timeout')), timeoutMs),
    ),
  ])
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image decode failed'))
    img.src = url
  })
}
