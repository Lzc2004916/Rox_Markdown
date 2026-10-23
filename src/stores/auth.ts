import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getToken, setToken, clearToken } from '@/utils/request'
import { redeem, getVipStatus, getPaidThemeList } from '@/api/auth'

// 简单XOR加密混淆，防止直接改localStorage明文
const encrypt = (str: string, key = 'rox_vip_2026'): string => {
  return btoa(str.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))).join(''))
}
const decrypt = (str: string, key = 'rox_vip_2026'): string => {
  try {
    return atob(str).split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))).join('')
  } catch { return '' }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(getToken())
  const active = ref(false)
  const vipType = ref<string>('FREE')
  const expireAtMs = ref<number>(0)
  const countdownNow = ref(Date.now())
  const paidThemes = ref<string[]>([])
  /** 用户点了 VIP 主题但还没激活，激活成功后自动切过去 */
  const pendingTheme = ref<string | null>(null)
  const loading = ref(false)
  /** 后端连不上时降级：离线模式，免费主题可用 */
  const offline = ref(false)
  /** 到期前3天提示过的标记 */
  const tipShown3Days = ref<boolean>(decrypt(localStorage.getItem('rox_tip_shown') || '') === '1')
  let expiryTimer: ReturnType<typeof setTimeout> | null = null
  let countdownTimer: ReturnType<typeof setInterval> | null = null

  const isLoggedIn = computed(() => !!token.value)
  const isVip = computed(() => {
    if (vipType.value === 'FREE' || vipType.value === 'EXPIRED') return false
    if (vipType.value === 'LIFETIME') return true
    return expireAtMs.value > Date.now()
  })
  // 剩余天数，永久卡返回-1
  const remainingDays = computed(() => {
    if (vipType.value === 'LIFETIME') return -1
    return Math.max(0, Math.ceil((expireAtMs.value - Date.now()) / 86400000))
  })
  const remainingTimeText = computed(() => {
    const totalSeconds = Math.max(0, Math.ceil((expireAtMs.value - countdownNow.value) / 1000))
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const clock = [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':')
    return days > 0 ? `${days}天 ${clock}` : clock
  })

  function refreshCountdown(): void {
    countdownNow.value = Date.now()
  }

  function stopCountdown(): void {
    if (countdownTimer) clearInterval(countdownTimer)
    countdownTimer = null
  }

  function startCountdown(): void {
    stopCountdown()
    refreshCountdown()
    countdownTimer = setInterval(() => {
      refreshCountdown()
      if (expireAtMs.value <= countdownNow.value) markExpired()
    }, 1000)
  }

  function isPaidTheme(themeId: string): boolean {
    return paidThemes.value.includes(themeId)
  }

  function scheduleExpiry(): void {
    if (expiryTimer) clearTimeout(expiryTimer)
    expiryTimer = null
    if (vipType.value === 'FREE' || vipType.value === 'EXPIRED' || vipType.value === 'LIFETIME') {
      stopCountdown()
      return
    }

    const remaining = expireAtMs.value - Date.now()
    if (remaining <= 0) {
      markExpired()
      return
    }

    startCountdown()

    // setTimeout 最大可靠延时约为 2^31-1ms，较长期限分段调度
    const delay = Math.min(remaining, 2147483647)
    expiryTimer = setTimeout(() => scheduleExpiry(), delay)
  }

  /** 启动时校验登录状态 */
  async function initFromStorage(): Promise<void> {
    loading.value = true
    try {
      // 调用新的公开接口拉付费主题列表
      const themeRes = await getPaidThemeList()
      paidThemes.value = themeRes.allPaidThemes || []
      localStorage.setItem('rox_paid_themes', encrypt(JSON.stringify(paidThemes.value)))
    } catch (e) {
      // 拉不到就降级：离线模式，恢复上次在线获取的付费主题列表
      try {
        const cachedPaidThemes = JSON.parse(decrypt(localStorage.getItem('rox_paid_themes') || ''))
        paidThemes.value = Array.isArray(cachedPaidThemes) ? cachedPaidThemes : []
      } catch {
        paidThemes.value = []
      }
      offline.value = true
    }

    if (!token.value) {
      active.value = false
      loading.value = false
      return
    }

    try {
      // 调用新的status接口拉最新状态和到期时间
      const statusRes = await getVipStatus()
      vipType.value = statusRes.type
      expireAtMs.value = statusRes.expireAtMs
      active.value = statusRes.type !== 'FREE' && statusRes.type !== 'EXPIRED'
      offline.value = false
      // 加密存本地
      localStorage.setItem('rox_vip_type', encrypt(statusRes.type))
      localStorage.setItem('rox_vip_expire', encrypt(String(statusRes.expireAtMs)))
    } catch (e) {
      // 离线，读本地加密缓存
      vipType.value = decrypt(localStorage.getItem('rox_vip_type') || 'FREE')
      expireAtMs.value = Number(decrypt(localStorage.getItem('rox_vip_expire') || '0')) || 0
      offline.value = true
      active.value = isVip.value
    } finally {
      scheduleExpiry()
      // 到期前3天弹一次提示
      if (remainingDays.value > 0 && remainingDays.value <= 3 && !tipShown3Days.value) {
        alert(`你的VIP还有${remainingDays.value}天到期，请及时续费`)
        tipShown3Days.value = true
        localStorage.setItem('rox_tip_shown', encrypt('1'))
      }
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
      active.value = true
      offline.value = false
      // 激活成功后拉最新状态
      await initFromStorage()
    } finally {
      loading.value = false
    }
  }

  /** 登出（暂时不用，预留） */
  function logout(): void {
    if (expiryTimer) clearTimeout(expiryTimer)
    expiryTimer = null
    stopCountdown()
    clearToken()
    token.value = null
    active.value = false
    vipType.value = 'FREE'
    expireAtMs.value = 0
  }

  /** 会员过期：重置VIP状态，前端UI自动更新 */
  function markExpired(): void {
    if (expiryTimer) clearTimeout(expiryTimer)
    expiryTimer = null
    stopCountdown()
    active.value = false
    vipType.value = 'EXPIRED'
    pendingTheme.value = null
  }

  return {
    token,
    active,
    vipType,
    expireAtMs,
    paidThemes,
    pendingTheme,
    loading,
    offline,
    tipShown3Days,
    isLoggedIn,
    isVip,
    remainingDays,
    remainingTimeText,
    refreshCountdown,
    isPaidTheme,
    initFromStorage,
    activate,
    logout,
    markExpired,
  }
})
