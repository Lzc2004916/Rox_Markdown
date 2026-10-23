import { describe, expect, it } from 'vitest'
import { resolveInlineDecorationColor, resolveInlineTextColor } from '../inline-format-colors'
import { parseInlineMarkdown } from '../measure'

describe('inline format colors', () => {
  it('keeps nested Markdown style semantics for canvas rendering', () => {
    const [token] = parseInlineMarkdown('**^组合格式^**')

    expect(token).toMatchObject({ text: '组合格式', bold: true, underline: true })
  })

  it('does not let underline or strike colors replace the text color', () => {
    const [token] = parseInlineMarkdown('**^组合格式^**')

    expect(resolveInlineTextColor(token!, {
      bold: '#dc2626',
      italic: '#16a34a',
      underline: '#2563eb',
      strike: '#f59e0b',
    })).toBe('#dc2626')
  })

  it('applies underline and strike colors to their own decoration only', () => {
    const [underline] = parseInlineMarkdown('^下划线^')
    const [strike] = parseInlineMarkdown('~~删除线~~')
    const colors = { underline: '#2563eb', strike: '#f97316' }

    expect(resolveInlineTextColor(underline!, colors)).toBeUndefined()
    expect(resolveInlineDecorationColor(underline!, colors)).toBe('#2563eb')
    expect(resolveInlineTextColor(strike!, colors)).toBeUndefined()
    expect(resolveInlineDecorationColor(strike!, colors)).toBe('#f97316')
  })

  it('uses the formula color before all other format colors', () => {
    const [token] = parseInlineMarkdown('$E = mc^2$')

    expect(resolveInlineTextColor(token!, {
      formula: '#7c3aed',
      underline: '#2563eb',
    })).toBe('#7c3aed')
  })
})
