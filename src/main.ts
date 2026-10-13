import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'


import { initPlatform } from './platforms'




const SPLASH_MIN_DURATION = 2000

const FADE_OUT_DURATION = 400


declare global {
  interface Window {
    __SPLASH_START__?: number
  }
}

function getSplashElapsed(): number {
  return Date.now() - (window.__SPLASH_START__ ?? Date.now())
}

async function bootstrap(): Promise<void> {
  
  await initPlatform()

  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)

  
  const elapsed = getSplashElapsed()
  const remaining = Math.max(0, SPLASH_MIN_DURATION - elapsed)
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining))
  }

  
  const splashEl = document.querySelector<HTMLDivElement>('#app .splash')

  
  app.mount('#app')

  
  if (splashEl) {
    document.querySelector('#app')!.appendChild(splashEl)
  }

  
  await new Promise<void>((resolve) => {
    const onReady = () => {
      window.removeEventListener('app-render-ready', onReady)
      resolve()
    }
    window.addEventListener('app-render-ready', onReady)
    
    setTimeout(() => {
      window.removeEventListener('app-render-ready', onReady)
      resolve()
    }, 8000)
  })

  
  if (splashEl) {
    splashEl.classList.add('splash-fade-out')
    await new Promise((resolve) => setTimeout(resolve, FADE_OUT_DURATION + 50))
    splashEl.remove()
  }
}

bootstrap()
