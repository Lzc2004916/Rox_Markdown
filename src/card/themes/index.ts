/**
 * 主题配置总入口
 * 所有主题定义都放在 themes/ 目录下，按风格分类后续可拆分成：
 * - modern.ts 现代简约类
 * - dark.ts 暗色科技类
 * - east.ts 东方国风类
 * - vintage.ts 复古彩色类
 */
import type { ThemeDefinition } from '../types'
import { THEMES as ALL_THEMES, DEFAULT_THEME_ID, getTheme as getThemeById } from './all'

export { DEFAULT_THEME_ID }

export const THEMES: ThemeDefinition[] = ALL_THEMES

/** 根据主题 id 查找主题定义，找不到返回默认主题 */
export function getTheme(id: string): ThemeDefinition {
  return getThemeById(id)
}

