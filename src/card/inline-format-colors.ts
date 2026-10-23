import type { InlineFormatColors, InlineToken } from './types'

/**
 * Resolves the text (or formula) color for a token. Underline and strike are
 * deliberately excluded: their colors belong to their decoration strokes only.
 */
export function resolveInlineTextColor(
  token: InlineToken,
  colors?: InlineFormatColors,
): string | null | undefined {
  if (!colors) return undefined
  if (token.formula) return colors.formula
  if (token.script === 'sup') return colors.superscript
  if (token.script === 'sub') return colors.subscript
  if (token.italic) return colors.italic
  if (token.bold) return colors.bold
  return undefined
}

/** Resolves a decoration-only color without changing the token's text color. */
export function resolveInlineDecorationColor(
  token: InlineToken,
  colors?: InlineFormatColors,
): string | null | undefined {
  if (!colors) return undefined
  if (token.underline) return colors.underline
  if (token.strike) return colors.strike
  return undefined
}
