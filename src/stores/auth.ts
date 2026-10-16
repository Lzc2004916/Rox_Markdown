import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getToken, setToken, clearToken } from '@/utils/request'
import { redeem } from '@/api/auth'
import { getMyTheme, getPublicThemes } from '@/api/theme'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(getToken())
  const active = ref(false)
  const paidThemes = ref<string[]>([])
  /** 用户点了 VIP 主题但还没激活，激活成功后自动切过去 */
  const pendingTheme = ref<string | null>(null)
  const loading = ref(false)
  /** 后端连不上时降级：离线模式，免费主题可用 */
  const offline = ref(false)

  const isLoggedIn = computed(() => !!token.value)
  const isVip = computed(() => active.value)

  function isPaidTheme(themeId: string): boolean {
    return paidThemes.value.includes(themeId)
  }

  /** 启动时校验登录状态 */
  async function initFromStorage(): Promise<void> {
    loading.value = true
    try {
      // 先拉付费主题列表（公开接口，不需要登录）
      const publicRes = await getPublicThemes()
      paidThemes.value = publicRes.paidThemes || []
    } catch (e) {
      // 拉不到就降级：没有付费主题（离线模式）
      offline.value = true
    }

    if (!token.value) {
      active.value = false
      loading.value = false
      return
    }

    try {
      const res = await getMyTheme()
      active.value = res.active
      paidThemes.value = res.paidThemes || paidThemes.value
    } catch (e) {
      // token 失效，清掉
      clearToken()
      token.value = null
      active.value = false
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
      active.value = true
      offline.value = false
    } finally {
      loading.value = false
    }
  }

  /** 登出（暂时不用，预留） */
  function logout(): void {
    clearToken()
    token.value = null
    active.value = false
  }

  /** 会员过期：重置VIP状态，前端UI自动更新 */
  function markExpired(): void {
    active.value = false
    pendingTheme.value = null
  }

  return {
    token,
    active,
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
