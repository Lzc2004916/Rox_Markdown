import { post } from '@/utils/request'

export interface RedeemResult {
  token: string
}

/** 用激活码兑换 JWT */
export function redeem(rawToken: string) {
  return post<RedeemResult>('/auth/redeem', { rawToken })
}
