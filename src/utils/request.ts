import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'

const TOKEN_KEY = 'rox_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 10000,
})

// 请求拦截器：自动加 JWT
service.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// 响应拦截器：统一解包 Result 结构
service.interceptors.response.use(
  (response: AxiosResponse) => {
    const res = response.data
    // 后端返回 { code, msg, data, success }
    if (res.success === true || res.code === '200') {
      return res.data
    }
    // 业务错误
    return Promise.reject(new Error(res.msg || '请求失败'))
  },
  (error) => {
    // 401 → token 失效，清掉
    if (error.response?.status === 401) {
      clearToken()
    }
    const msg = error.response?.data?.msg || error.message || '网络错误'
    return Promise.reject(new Error(msg))
  },
)

// 封装 get/post，返回值直接就是 data
export async function get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return service.get(url, config) as unknown as Promise<T>
}

export async function post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
  return service.post(url, data, config) as unknown as Promise<T>
}

export default service
