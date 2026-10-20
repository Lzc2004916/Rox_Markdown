import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// 复刻 auth.ts 的 XOR 混淆（key='rox_vip_2026'），用于向 localStorage 注入离线缓存
const KEY = 'rox_vip_2026'
function xorEncrypt(str: string): string {
  const x = str
    .split('')
    .map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ KEY.charCodeAt(i % KEY.length)))
    .join('')
  return btoa(x)
}

// 对应 ThemeSelector.select + App.vue selectTheme 的权限决策
// ThemeSelector 会先拦截无效 VIP；通过后，App 在线走服务端校验、离线按本地 isVip 判定。
type Decision = 'apply' | 'block-need-activate' | 'server-check'
function decideSelection(store: any, themeId: string): Decision {
  if (!store.isPaidTheme(themeId)) return 'apply'
  if (!store.isVip) return 'block-need-activate'
  if (store.offline) return 'apply'
  return 'server-check'
}

vi.mock('@/api/auth', () => ({
  redeem: vi.fn(),
  getVipStatus: vi.fn(),
  getPaidThemeList: vi.fn(),
}))

import { useAuthStore } from '@/stores/auth'
import * as apiAuth from '@/api/auth'

const DAY = 86400000
const PAID_THEME = 'royal-ink'

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  setActivePinia(createPinia())
  vi.stubGlobal('alert', vi.fn())
})

describe('VIP 离线场景验证', () => {
  it('7天VIP·临近到期(剩2天)·离线 → 仍可使用专属主题', async () => {
    localStorage.setItem('rox_token', 'cached-jwt')
    localStorage.setItem('rox_vip_type', xorEncrypt('WEEK'))
    localStorage.setItem('rox_vip_expire', xorEncrypt(String(Date.now() + 2 * DAY)))
    localStorage.setItem('rox_paid_themes', xorEncrypt(JSON.stringify([PAID_THEME])))

    vi.mocked(apiAuth.getPaidThemeList).mockRejectedValue(new Error('network'))
    vi.mocked(apiAuth.getVipStatus).mockRejectedValue(new Error('network'))

    const store = useAuthStore()
    await store.initFromStorage()

    expect(store.offline).toBe(true)
    expect(store.isVip).toBe(true)
    expect(store.paidThemes).toEqual([PAID_THEME])
    expect(decideSelection(store, PAID_THEME)).toBe('apply')
  })

  it('应用持续离线并跨过到期时刻 → 自动失效并禁止专属主题', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-10-20T08:00:00.000Z')
    vi.setSystemTime(now)

    localStorage.setItem('rox_token', 'cached-jwt')
    localStorage.setItem('rox_vip_type', xorEncrypt('WEEK'))
    localStorage.setItem('rox_vip_expire', xorEncrypt(String(now.getTime() + 1000)))
    localStorage.setItem('rox_paid_themes', xorEncrypt(JSON.stringify([PAID_THEME])))
    vi.mocked(apiAuth.getPaidThemeList).mockRejectedValue(new Error('network'))
    vi.mocked(apiAuth.getVipStatus).mockRejectedValue(new Error('network'))

    const store = useAuthStore()
    await store.initFromStorage()
    expect(store.isVip).toBe(true)

    await vi.advanceTimersByTimeAsync(1000)

    expect(store.vipType).toBe('EXPIRED')
    expect(store.isVip).toBe(false)
    expect(decideSelection(store, PAID_THEME)).toBe('block-need-activate')
    vi.useRealTimers()
  })

  it('VIP缓存已过期·离线 → 禁止使用专属主题', async () => {
    localStorage.setItem('rox_token', 'cached-jwt')
    localStorage.setItem('rox_vip_type', xorEncrypt('WEEK'))
    localStorage.setItem('rox_vip_expire', xorEncrypt(String(Date.now() - DAY)))
    localStorage.setItem('rox_paid_themes', xorEncrypt(JSON.stringify([PAID_THEME])))

    vi.mocked(apiAuth.getPaidThemeList).mockRejectedValue(new Error('network'))
    vi.mocked(apiAuth.getVipStatus).mockRejectedValue(new Error('network'))

    const store = useAuthStore()
    await store.initFromStorage()

    expect(store.offline).toBe(true)
    expect(store.isVip).toBe(false)
    expect(store.isPaidTheme(PAID_THEME)).toBe(true)
    expect(decideSelection(store, PAID_THEME)).toBe('block-need-activate')
  })

  it('在线获取的付费主题列表会缓存，并可在下次离线启动时恢复', async () => {
    localStorage.setItem('rox_token', 'cached-jwt')
    vi.mocked(apiAuth.getPaidThemeList).mockResolvedValue({
      allPaidThemes: [PAID_THEME],
      allowedPaidThemes: [PAID_THEME],
    })
    vi.mocked(apiAuth.getVipStatus).mockResolvedValue({
      token: 'cached-jwt',
      type: 'WEEK',
      expireAtMs: Date.now() + 2 * DAY,
    })

    const onlineStore = useAuthStore()
    await onlineStore.initFromStorage()
    expect(onlineStore.paidThemes).toEqual([PAID_THEME])

    setActivePinia(createPinia())
    vi.mocked(apiAuth.getPaidThemeList).mockRejectedValue(new Error('network'))
    vi.mocked(apiAuth.getVipStatus).mockRejectedValue(new Error('network'))

    const offlineStore = useAuthStore()
    await offlineStore.initFromStorage()

    expect(offlineStore.offline).toBe(true)
    expect(offlineStore.paidThemes).toEqual([PAID_THEME])
    expect(offlineStore.isVip).toBe(true)
  })
})
