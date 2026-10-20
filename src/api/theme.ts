import { get } from '@/utils/request'

export interface MyThemeResult {
  active: boolean
  type?: string
  expireAt?: number | null
  paidThemes?: string[]
}

export interface AccessResult {
  allowed: boolean
}

export interface PublicThemesResult {
  paidThemes: string[]
}

/** 查询当前用户会员状态 */
export function getMyTheme() {
  return get<MyThemeResult>('/theme/my')
}

/** 公开接口：获取付费主题列表（不需要登录） */
export function getPublicThemes() {
  return get<PublicThemesResult>('/theme/public')
}

/** 校验是否有权限使用某个主题 */
export function checkThemeAccess(themeId: string) {
  return get<AccessResult>('/theme/access', { params: { themeId } })
}

