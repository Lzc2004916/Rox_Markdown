import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getToken, setToken, clearToken } from '@/utils/request'
import { redeem } from '@/api/auth'
import { getMyTheme, getPublicThemes } from '@/api/theme'

// 本地缓存的异或混淆密钥（仅混淆，非真正加密）
const XOR_KEY = 'rox_vip_2026'
const VIP_TYPE_KEY = 'rox_vip_type'
const VIP_EXPIRE_KEY = 'rox_vip_expire'
const PAID_THEMES_KEY = 'rox_paid_themes'

function xorBytes(str: string): string {
  return [...str]
    .map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length)))
    .join('')
}

function encrypt(str: string): string {
  return btoa(xorBytes(str))
}

function decrypt(encoded: string): string {
  return xorBytes(atob(encoded))
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(getToken())
  const offline = ref(false)
  /** VIP 类型：'NONE' | 'WEEK' | 'MONTH' | ... | 'EXPIRED' */
  const vipType = ref('NONE')
  /** VIP 到期时间戳（毫秒），永久卡为 null */
  const vipExpire = ref<number | null>(null)
  const paidThemes = ref<string[]>([])
  /** 用户点了 VIP 主题但还没激活，激活成功后自动切过去 */
  const pendingTheme = ref<string | null>(null)
  const loading = ref(false)

  let expireTimer: ReturnType<typeof setTimeout> | null = null

  const isLoggedIn = computed(() => !!token.value)
  const isVip = computed(
    () => vipType.value !== 'NONE' && vipType.value !== 'EXPIRED' && (vipExpire.value === null || vipExpire.value > Date.now()),
  )

  function isPaidTheme(themeId: string): boolean {
    return paidThemes.value.includes(themeId)
  }

  function persistVip(): void {
    try {
      localStorage.setItem(VIP_TYPE_KEY, encrypt(vipType.value))
      if (vipExpire.value !== null) {
        localStorage.setItem(VIP_EXPIRE_KEY, encrypt(String(vipExpire.value)))
      } else {
        localStorage.removeItem(VIP_EXPIRE_KEY)
      }
      localStorage.setItem(PAID_THEMES_KEY, encrypt(JSON.stringify(paidThemes.value)))
    } catch {
      // 本地缓存写失败不影响主流程
    }
  }

  function clearExpireTimer(): void {
    if (expireTimer) {
      clearTimeout(expireTimer)
      expireTimer = null
    }
  }

  function scheduleExpiry(): void {
    clearExpireTimer()
    if (vipExpire.value !== null && vipExpire.value > Date.now()) {
      expireTimer = setTimeout(() => {
        vipType.value = 'EXPIRED'
        vipExpire.value = null
        pendingTheme.value = null
        persistVip()
      }, vipExpire.value - Date.now())
    }
  }

  /** 先从本地缓存恢复离线状态，并处理已过期的情况 */
  function applyCachedVip(): void {
    try {
      const cachedType = localStorage.getItem(VIP_TYPE_KEY)
      if (cachedType) vipType.value = decrypt(cachedType)
      const cachedExpire = localStorage.getItem(VIP_EXPIRE_KEY)
      if (cachedExpire) vipExpire.value = Number(decrypt(cachedExpire))
      const cachedThemes = localStorage.getItem(PAID_THEMES_KEY)
      if (cachedThemes) paidThemes.value = JSON.parse(decrypt(cachedThemes))
    } catch {
      // 缓存损坏则忽略
    }
    if (vipExpire.value !== null && vipExpire.value <= Date.now()) {
      vipType.value = 'EXPIRED'
      vipExpire.value = null
    }
    scheduleExpiry()
  }

  /** 启动时校验登录状态 */
  async function initFromStorage(): Promise<void> {
    loading.value = true
    offline.value = false
    applyCachedVip()

    if (!token.value) {
      loading.value = false
      return
    }

    try {
      // 先拉付费主题列表（公开接口，不需要登录）
      const publicRes = await getPublicThemes()
      paidThemes.value = publicRes.paidThemes || []
    } catch {
      // 拉不到就降级：离线模式，用本地缓存
      offline.value = true
    }

    try {
      const res = await getMyTheme()
      offline.value = false
      if (res.active) {
        vipType.value = res.type || 'WEEK'
        vipExpire.value = res.expireAt ?? null
      } else {
        vipType.value = 'EXPIRED'
        vipExpire.value = null
      }
      if (res.paidThemes) paidThemes.value = res.paidThemes
      persistVip()
      scheduleExpiry()
    } catch {
      // 网络异常 → 离线，保留本地缓存，不清 token，离线也能继续用
      offline.value = true
    } finally {
      loading.value = false
    }
  }

  /** 激活码兑换 */
  async function activate(rawToken: string): Promise<void> {
    loading.value = true
    try {
      const res = await redeem(rawToken.trim().toUpperCase())
      token.value = res.token
      setToken(res.token)
      offline.value = false

      // 激活成功后拉取最新 VIP 状态
      try {
        const my = await getMyTheme()
        if (my.active) {
          vipType.value = my.type || 'WEEK'
          vipExpire.value = my.expireAt ?? null
        } else {
          vipType.value = 'EXPIRED'
          vipExpire.value = null
        }
        if (my.paidThemes) paidThemes.value = my.paidThemes
      } catch {
        // 拉状态失败不影响激活
      }
      persistVip()
      scheduleExpiry()
    } finally {
      loading.value = false
    }
  }

  /** 登出（暂时不用，预留） */
  function logout(): void {
    clearToken()
    token.value = null
    vipType.value = 'EXPIRED'
    vipExpire.value = null
    pendingTheme.value = null
    clearExpireTimer()
    persistVip()
  }

  /** 会员过期：重置VIP状态，前端UI自动更新 */
  function markExpired(): void {
    vipType.value = 'EXPIRED'
    vipExpire.value = null
    pendingTheme.value = null
    clearExpireTimer()
    persistVip()
  }

  return {
    token,
    vipType,
    vipExpire,
    paidThemes,
    pendingTheme,
    loading,
    offline,
    isLoggedIn,
    isVip,
    isPaidTheme,
    initFromStorage,
    activate,
    logout,
    markExpired,
  }
})