import { post, get } from '@/utils/request'

export interface RedeemResult {
  token: string
}

/** 用激活码兑换 JWT */
export function redeem(rawToken: string) {
  return post<RedeemResult>('/auth/login', { token: rawToken })
}

export interface VipStatusResult {
  type: string
  expireAtMs: number
}

/** 查询当前VIP状态 */
export function getVipStatus() {
  return get<VipStatusResult>('/auth/status')
}

export interface PaidThemeListResult {
  allPaidThemes: string[]
  allowedPaidThemes: string[]
}

/** 获取公开付费主题列表 */
export function getPaidThemeList() {
  return get<PaidThemeListResult>('/theme/public')
}

