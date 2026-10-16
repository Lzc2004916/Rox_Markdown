/**
 * 全局轻量提示工具
 * 直接调用 toast.success / toast.error / toast.info 就行
 */

type ToastType = 'success' | 'error' | 'info'
interface ToastItem {
  id: number
  type: ToastType
  message: string
  actionText?: string
  actionCallback?: () => void
}

let toastList: ToastItem[] = []
let listeners: ((list: ToastItem[]) => void)[] = []
let nextId = 1

function emit() {
  listeners.forEach(fn => fn([...toastList]))
}

/** 弹出提示，默认 2.5 秒自动消失 */
function show(type: ToastType, message: string, duration = 2500, actionText?: string, actionCallback?: () => void) {
  const item: ToastItem = { id: nextId++, type, message, actionText, actionCallback }
  toastList.push(item)
  emit()
  setTimeout(() => {
    toastList = toastList.filter(t => t.id !== item.id)
    emit()
  }, duration)
}

export const toast = {
  success: (msg: string, duration?: number) => show('success', msg, duration),
  error: (msg: string, duration?: number) => show('error', msg, duration),
  info: (msg: string, duration?: number, actionText?: string, actionCallback?: () => void) => show('info', msg, duration, actionText, actionCallback),
}

/** 供 ToastContainer 组件订阅，不用外部手动调 */
export function _subscribeToast(fn: (list: ToastItem[]) => void) {
  listeners.push(fn)
  fn([...toastList])
  return () => {
    listeners = listeners.filter(l => l !== fn)
  }
}
