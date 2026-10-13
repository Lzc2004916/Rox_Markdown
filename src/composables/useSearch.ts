


import { ref, computed, type Ref, type ComputedRef } from 'vue'



export interface SearchMatch {
  
  from: number
  
  to: number
  
  contentFrom: number
  
  contentTo: number
  
  text: string
}

export interface SearchOptions {
  
  contentOnly?: boolean
  
  caseSensitive?: boolean
}

export interface SearchState {
  
  query: Ref<string>
  
  activeIndex: Ref<number>
  
  matches: Ref<SearchMatch[]>
  
  options: Ref<SearchOptions>
  
  total: ComputedRef<number>
  
  hasMatches: ComputedRef<boolean>
}

export interface UseSearchReturn extends SearchState {
  
  search: (query: string, source: string, options?: SearchOptions) => void
  
  next: () => SearchMatch | null
  
  prev: () => SearchMatch | null
  
  clear: () => void
}




export interface ContentViewResult {
  
  view: string
  
  mask: boolean[]
}


export function buildContentView(source: string): ContentViewResult {
  
  const chars = source.split('')
  const mask = new Array<boolean>(chars.length).fill(false)

  
  function maskRange(from: number, to: number): void {
    for (let i = from; i < to && i < mask.length; i++) {
      mask[i] = true
    }
  }

  
  function isMasked(pos: number): boolean {
    return pos < mask.length && mask[pos]
  }

  
  const fenceRe = /^```[\s\S]*?^```/gm
  for (const m of source.matchAll(fenceRe)) {
    if (m.index !== undefined) {
      maskRange(m.index, m.index + m[0].length)
    }
  }

  
  const inlineCodeRe = /`[^`\n]+`/g
  for (const m of source.matchAll(inlineCodeRe)) {
    if (m.index !== undefined && !isMasked(m.index)) {
      maskRange(m.index, m.index + m[0].length)
    }
  }

  
  const imageRe = /!\[([^\]]*)\]\([^)]+\)/g
  for (const m of source.matchAll(imageRe)) {
    if (m.index !== undefined && !isMasked(m.index)) {
      maskRange(m.index, m.index + m[0].length)
    }
  }

  
  const linkRe = /\[([^\]]*)\]\([^)]+\)/g
  for (const m of source.matchAll(linkRe)) {
    if (m.index !== undefined && !isMasked(m.index)) {
      
      const fullMatch = m[0]
      const textPart = m[1]
      const textStart = fullMatch.indexOf('[')
      const textEnd = textStart + textPart.length + 1 
      
      maskRange(m.index, m.index + textStart + 1) 
      maskRange(m.index + textEnd, m.index + fullMatch.length) 
    }
  }

  
  const boldRe = /\*\*([^*\n]+?)\*\*|__([^_\n]+?)__/g
  for (const m of source.matchAll(boldRe)) {
    if (m.index !== undefined && !isMasked(m.index)) {
      const full = m[0]
      const inner = m[1] ?? m[2]
      const innerStart = full.indexOf(inner)
      
      maskRange(m.index, m.index + innerStart)
      maskRange(m.index + innerStart + inner.length, m.index + full.length)
    }
  }

  
  const italicRe = /(?<!\*)\*([^*\n]+?)\*(?!\*)|(?<!_)_([^_\n]+?)_(?!_)/g
  for (const m of source.matchAll(italicRe)) {
    if (m.index !== undefined && !isMasked(m.index)) {
      const full = m[0]
      const inner = m[1] ?? m[2]
      const innerStart = full.indexOf(inner)
      maskRange(m.index, m.index + innerStart)
      maskRange(m.index + innerStart + inner.length, m.index + full.length)
    }
  }

  
  const strikethroughRe = /~~([^\n]+?)~~/g
  for (const m of source.matchAll(strikethroughRe)) {
    if (m.index !== undefined && !isMasked(m.index)) {
      const full = m[0]
      const inner = m[1]
      const innerStart = full.indexOf(inner)
      maskRange(m.index, m.index + innerStart)
      maskRange(m.index + innerStart + inner.length, m.index + full.length)
    }
  }

  
  const markRe = /==([^\n]+?)==/g
  for (const m of source.matchAll(markRe)) {
    if (m.index !== undefined && !isMasked(m.index)) {
      const full = m[0]
      const inner = m[1]
      const innerStart = full.indexOf(inner)
      maskRange(m.index, m.index + innerStart)
      maskRange(m.index + innerStart + inner.length, m.index + full.length)
    }
  }

  
  const underlineRe = /\^([^^\n]+?)\^/g
  for (const m of source.matchAll(underlineRe)) {
    if (m.index !== undefined && !isMasked(m.index)) {
      const full = m[0]
      const inner = m[1]
      const innerStart = full.indexOf(inner)
      maskRange(m.index, m.index + innerStart)
      maskRange(m.index + innerStart + inner.length, m.index + full.length)
    }
  }

  
  const headingRe = /^#{1,6}\s/gm
  for (const m of source.matchAll(headingRe)) {
    if (m.index !== undefined && !isMasked(m.index)) {
      maskRange(m.index, m.index + m[0].length)
    }
  }

  
  const quoteRe = /^>\s?/gm
  for (const m of source.matchAll(quoteRe)) {
    if (m.index !== undefined && !isMasked(m.index)) {
      maskRange(m.index, m.index + m[0].length)
    }
  }

  
  const ulRe = /^[\s]*[-*+]\s/gm
  for (const m of source.matchAll(ulRe)) {
    if (m.index !== undefined && !isMasked(m.index)) {
      maskRange(m.index, m.index + m[0].length)
    }
  }

  
  const olRe = /^[\s]*\d+[.)]\s/gm
  for (const m of source.matchAll(olRe)) {
    if (m.index !== undefined && !isMasked(m.index)) {
      maskRange(m.index, m.index + m[0].length)
    }
  }

  
  const hrRe = /^[-*_]{3,}\s*$/gm
  for (const m of source.matchAll(hrRe)) {
    if (m.index !== undefined && !isMasked(m.index)) {
      maskRange(m.index, m.index + m[0].length)
    }
  }

  
  const htmlRe = /<\/?[a-zA-Z][^>]*>/g
  for (const m of source.matchAll(htmlRe)) {
    if (m.index !== undefined && !isMasked(m.index)) {
      maskRange(m.index, m.index + m[0].length)
    }
  }

  
  let result = ''
  for (let i = 0; i < chars.length; i++) {
    result += mask[i] ? ' ' : chars[i]
  }
  return { view: result, mask }
}


export function mapContentToSource(contentPos: number, mask: boolean[]): number {
  
  
  return Math.min(contentPos, mask.length)
}


export function mapContentRangeToSource(
  contentFrom: number,
  contentTo: number,
  mask: boolean[],
  source: string,
): { from: number; to: number; text: string } {
  let from = contentFrom
  let to = contentTo

  
  while (from < mask.length && mask[from]) from++
  
  while (to < mask.length && mask[to]) to++

  
  
  while (from < to && mask[from]) from++
  
  while (to > from && mask[to - 1]) to--

  return {
    from: Math.min(from, source.length),
    to: Math.min(to, source.length),
    text: source.slice(Math.min(from, source.length), Math.min(to, source.length)),
  }
}



export function useSearch(): UseSearchReturn {
  const query = ref('')
  const activeIndex = ref(-1)
  const matches = ref<SearchMatch[]>([])
  const options = ref<SearchOptions>({
    contentOnly: true,
    caseSensitive: false,
  })

  
  let lastSource = ''
  let lastContentView = ''
  let lastMask: boolean[] = []
  let lastContentOnly: boolean | null = null

  const total = computed(() => matches.value.length)
  const hasMatches = computed(() => matches.value.length > 0)

  
  function search(
    searchQuery: string,
    source: string,
    searchOpts?: SearchOptions,
  ): void {
    const opts = { ...options.value, ...searchOpts }
    query.value = searchQuery

    if (!searchQuery || !source) {
      matches.value = []
      activeIndex.value = -1
      return
    }

    
    if (opts.contentOnly && (source !== lastSource || lastContentOnly !== opts.contentOnly)) {
      const result = buildContentView(source)
      lastContentView = result.view
      lastMask = result.mask
      lastSource = source
      lastContentOnly = opts.contentOnly
    }

    const searchText = opts.contentOnly ? lastContentView : source
    const flags = opts.caseSensitive ? 'g' : 'gi'
    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escapedQuery, flags)

    const results: SearchMatch[] = []
    for (const m of searchText.matchAll(regex)) {
      const contentFrom = m.index!
      const contentTo = contentFrom + m[0].length

      if (opts.contentOnly) {
        
        const mapped = mapContentRangeToSource(contentFrom, contentTo, lastMask, source)
        results.push({
          from: mapped.from,
          to: mapped.to,
          contentFrom,
          contentTo,
          text: mapped.text || m[0],
        })
      } else {
        results.push({
          from: contentFrom,
          to: contentTo,
          contentFrom,
          contentTo,
          text: m[0],
        })
      }
    }

    matches.value = results
    activeIndex.value = results.length > 0 ? 0 : -1
  }

  
  function next(): SearchMatch | null {
    if (matches.value.length === 0) return null
    activeIndex.value = (activeIndex.value + 1) % matches.value.length
    return matches.value[activeIndex.value] ?? null
  }

  
  function prev(): SearchMatch | null {
    if (matches.value.length === 0) return null
    activeIndex.value =
      activeIndex.value <= 0
        ? matches.value.length - 1
        : activeIndex.value - 1
    return matches.value[activeIndex.value] ?? null
  }

  
  function clear(): void {
    query.value = ''
    activeIndex.value = -1
    matches.value = []
    lastSource = ''
    lastContentView = ''
    lastMask = []
    lastContentOnly = null
  }

  return {
    query,
    activeIndex,
    matches,
    options,
    total,
    hasMatches,
    search,
    next,
    prev,
    clear,
  }
}
