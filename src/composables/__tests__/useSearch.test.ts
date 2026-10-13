

import { describe, it, expect, beforeEach } from 'vitest'
import { useSearch, buildContentView, mapContentRangeToSource } from '../useSearch'

const PLAIN_TEXT = `静夜思
床前明月光
疑是地上霜
举头望明月
低头思故乡`

const MARKDOWN_SAMPLE = `# 静夜思

**作者：**李白

床前==明月光==，
疑是^地上霜^。

> 举头望明月，
> 低头思故乡。

## 注释

- 此诗描写了秋日夜晚
- 诗人抬头望月的情景

1. 第一句：床前明月光
2. 第二句：疑是地上霜
3. 第三句：举头望明月
4. 第四句：低头思故乡

以下是 \`代码示例\`：

\`\`\`
月光如水
洒在床前
\`\`\`

更多信息请访问 [百度](https://www.baidu.com)。
`

describe('buildContentView', () => {
  it('应移除标题 # 前缀', () => {
    const { view } = buildContentView('# 标题')
    
    expect(view.length).toBe(4) 
    expect(view[0]).toBe(' ')
    expect(view[1]).toBe(' ')
  })

  it('应移除粗体 ** 标记', () => {
    const { view } = buildContentView('这是 **粗体** 文本')
    
    expect(view.length).toBe(12)
    
    expect(view).toContain('粗体')
  })

  it('应移除斜体 * 标记（单 *）', () => {
    const { view } = buildContentView('这是 *斜体* 文本')
    expect(view.length).toBe(10)
    
    expect(view).toContain('斜体')
  })

  it('应移除行内代码 ` 标记', () => {
    const { view, mask } = buildContentView('使用 `code` 示例')
    
    expect(mask.some((m) => m)).toBe(true)
    
    expect(view).toContain('示例')
  })

  it('应移除链接语法 [text](url)，保留链接文本', () => {
    const { view, mask } = buildContentView('访问 [百度](https://baidu.com) 查看')
    
    expect(view).toContain('百度')
    
    expect(view).not.toContain('baidu.com')
    
    expect(mask.some((m) => m)).toBe(true)
  })

  it('应移除引用前缀 >', () => {
    const { view } = buildContentView('> 引用文本')
    
    expect(view[0]).toBe(' ')
    expect(view).toContain('引用文本')
  })

  it('应移除无序列表前缀 -', () => {
    const { view } = buildContentView('- 列表项')
    expect(view[0]).toBe(' ')
    expect(view).toContain('列表项')
  })

  it('应移除有序列表前缀 1.', () => {
    const { view } = buildContentView('1. 第一项')
    
    expect(view[0]).toBe(' ')
    expect(view).toContain('第一项')
  })

  it('应移除高亮 == 标记', () => {
    const { view } = buildContentView('==高亮== 文本')
    expect(view).toContain('高亮')
    expect(view).toContain('文本')
  })

  it('应保留下划线 ^ 标记的内部文本', () => {
    const { view } = buildContentView('这是 ^下划线^ 文本')
    
    expect(view).toContain('下划线')
    expect(view).toContain('文本')
  })

  it('应保留纯文本不变', () => {
    const { view } = buildContentView('这是纯文本内容')
    expect(view).toBe('这是纯文本内容')
  })

  it('应处理空字符串', () => {
    const { view, mask } = buildContentView('')
    expect(view).toBe('')
    expect(mask).toEqual([])
  })

  it('内容视图长度应与源文本一致', () => {
    const { view } = buildContentView(MARKDOWN_SAMPLE)
    expect(view.length).toBe(MARKDOWN_SAMPLE.length)
  })

  it('屏蔽数组长度应与源文本一致', () => {
    const { mask } = buildContentView(MARKDOWN_SAMPLE)
    expect(mask.length).toBe(MARKDOWN_SAMPLE.length)
  })
})

describe('mapContentRangeToSource', () => {
  it('应正确映射纯文本中的范围（无屏蔽字符）', () => {
    const source = '床前明月光'
    const mask = new Array(source.length).fill(false)
    const result = mapContentRangeToSource(2, 4, mask, source)
    expect(result.text).toBe('明月')
  })

  it('应在有屏蔽字符时正确映射', () => {
    
    const source = '**明月** 光'
    const mask = [true, true, false, false, true, true, false]  
    const result = mapContentRangeToSource(2, 4, mask, source)
    expect(result.text).toBe('明月')
  })
})

describe('useSearch — 原始文本模式', () => {
  let search: ReturnType<typeof useSearch>

  beforeEach(() => {
    search = useSearch()
  })

  it('应在普通文本中查找到关键词', () => {
    search.search('明月', PLAIN_TEXT, { contentOnly: false })
    expect(search.total.value).toBe(2)
    expect(search.matches.value[0]?.text).toBe('明月')
  })

  it('应返回空列表当无匹配时', () => {
    search.search('不存在的词', PLAIN_TEXT, { contentOnly: false })
    expect(search.total.value).toBe(0)
    expect(search.activeIndex.value).toBe(-1)
  })

  it('应在空查询词时返回空列表', () => {
    search.search('', PLAIN_TEXT, { contentOnly: false })
    expect(search.total.value).toBe(0)
  })

  it('应在空源文本时返回空列表', () => {
    search.search('明月', '', { contentOnly: false })
    expect(search.total.value).toBe(0)
  })

  it('应区分大小写（caseSensitive: true）', () => {
    search.search('TEXT', 'Some TEXT here and text there', {
      contentOnly: false,
      caseSensitive: true,
    })
    expect(search.total.value).toBe(1)
    expect(search.matches.value[0]?.text).toBe('TEXT')
  })

  it('应不区分大小写（默认）', () => {
    search.search('text', 'Some TEXT here and text there', {
      contentOnly: false,
    })
    expect(search.total.value).toBe(2)
  })

  it('next() 应循环遍历匹配项', () => {
    search.search('明月', PLAIN_TEXT, { contentOnly: false })
    expect(search.total.value).toBe(2)

    
    expect(search.activeIndex.value).toBe(0)
    expect(search.matches.value[0]?.text).toBe('明月')

    
    const m1 = search.next()
    expect(search.activeIndex.value).toBe(1)
    expect(m1?.text).toBe('明月')

    
    const m2 = search.next()
    expect(search.activeIndex.value).toBe(0)
    expect(m2?.text).toBe('明月')
  })

  it('prev() 应反向循环遍历匹配项', () => {
    search.search('明月', PLAIN_TEXT, { contentOnly: false })

    
    expect(search.activeIndex.value).toBe(0)

    
    const m1 = search.prev()
    expect(search.activeIndex.value).toBe(1)
    expect(m1?.text).toBe('明月')

    
    search.prev()
    expect(search.activeIndex.value).toBe(0)
  })

  it('next/prev 在无匹配时应返回 null', () => {
    search.search('不存在的词', PLAIN_TEXT)
    expect(search.next()).toBeNull()
    expect(search.prev()).toBeNull()
  })

  it('clear() 应重置所有状态', () => {
    search.search('明月', PLAIN_TEXT, { contentOnly: false })
    expect(search.total.value).toBe(2)

    search.clear()
    expect(search.query.value).toBe('')
    expect(search.total.value).toBe(0)
    expect(search.activeIndex.value).toBe(-1)
    expect(search.matches.value).toEqual([])
  })
})

describe('useSearch — 仅文本内容模式', () => {
  let search: ReturnType<typeof useSearch>

  beforeEach(() => {
    search = useSearch()
  })

  it('应忽略 markdown 语法匹配文本内容', () => {
    const src = '# 明月几时有\n\n把酒问青天'
    search.search('明月', src, { contentOnly: true })
    expect(search.total.value).toBe(1)
    
    expect(search.matches.value[0]?.text).toContain('明月')
  })

  it('不应匹配 markdown 语法标记（如 #）', () => {
    const src = '# 标题内容'
    search.search('#', src, { contentOnly: true })
    
    expect(search.total.value).toBe(0)
  })

  it('不应匹配 ** 标记', () => {
    const src = '这是 **粗体** 文本'
    search.search('**', src, { contentOnly: true })
    expect(search.total.value).toBe(0)
  })

  it('应匹配粗体内部的文本', () => {
    const src = '这是 **重要** 内容'
    search.search('重要', src, { contentOnly: true })
    expect(search.total.value).toBe(1)
    expect(search.matches.value[0]?.text).toContain('重要')
  })

  it('应匹配链接文本', () => {
    const src = '访问 [百度](https://baidu.com) 了解更多'
    search.search('百度', src, { contentOnly: true })
    expect(search.total.value).toBe(1)
    expect(search.matches.value[0]?.text).toContain('百度')
  })

  it('不应匹配链接 URL', () => {
    const src = '访问 [百度](https://baidu.com) 了解更多'
    search.search('baidu.com', src, { contentOnly: true })
    
    expect(search.total.value).toBe(0)
  })

  it('应在包含 Markdown 的完整文档中搜索', () => {
    search.search('明月', MARKDOWN_SAMPLE, { contentOnly: true })
    
    expect(search.total.value).toBeGreaterThanOrEqual(2)
  })

  it('应在内容视图中搜索不区分大小写', () => {
    const src = 'Hello **World**! hello again.'
    search.search('hello', src, { contentOnly: true })
    
    expect(search.total.value).toBe(2)
  })
})

describe('useSearch — 边界情况', () => {
  let search: ReturnType<typeof useSearch>

  beforeEach(() => {
    search = useSearch()
  })

  it('应处理正则特殊字符（如 . * + 等）', () => {
    const src = '这个文件是 test.ts 和 index.js'
    search.search('test.ts', src, { contentOnly: false })
    expect(search.total.value).toBe(1)
    expect(search.matches.value[0]?.text).toBe('test.ts')
  })

  it('应处理中文标点搜索', () => {
    const src = '你好，世界！这是一个测试。'
    search.search('世界', src, { contentOnly: false })
    expect(search.total.value).toBe(1)
  })

  it('应处理连续相同字符的搜索', () => {
    const src = 'aaaa bbbb aaaa cccc aaaa'
    search.search('aaaa', src, { contentOnly: false })
    expect(search.total.value).toBe(3)
  })

  it('应处理多行匹配', () => {
    const src = 'line1\nline2\nline3\nline2\n'
    search.search('line2', src, { contentOnly: false })
    expect(search.total.value).toBe(2)
  })

  it('应在多次搜索间正确切换', () => {
    search.search('明月', MARKDOWN_SAMPLE, { contentOnly: true })
    const firstCount = search.total.value
    expect(firstCount).toBeGreaterThan(0)

    search.search('不存在的词', MARKDOWN_SAMPLE, { contentOnly: true })
    expect(search.total.value).toBe(0)
    expect(search.activeIndex.value).toBe(-1)
  })

  it('搜索选项 contentOnly 默认为 true', () => {
    const src = '# 标题文本'
    
    search.search('#', src)
    expect(search.total.value).toBe(0) 
  })

  it('应处理超长源文本的搜索性能', () => {
    
    const lines: string[] = []
    for (let i = 0; i < 500; i++) {
      lines.push(`这是第 ${i} 行文本内容，包含关键词明月在行尾。`)
    }
    const largeText = lines.join('\n')

    const start = performance.now()
    search.search('明月', largeText, { contentOnly: true })
    const elapsed = performance.now() - start

    expect(search.total.value).toBe(500)
    
    expect(elapsed).toBeLessThan(200)
  })
})
