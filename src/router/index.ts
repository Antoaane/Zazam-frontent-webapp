import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '@/views/Landing/LoginView.vue'
import CallbackView from '@/views/Landing/CallbackView.vue'
import Zazam from '@/views/Zazam/Zazam.vue'

const ACCESS_TOKEN_KEY = 'spotify_access_token'
const EXPIRES_AT_KEY = 'spotify_token_expires_at'
const AUTH_CODE_KEY = 'spotify_auth_code'
const AUTH_CODE_RECEIVED_AT_KEY = 'spotify_auth_code_received_at'
const AUTH_CODE_TTL_MS = 10 * 60 * 1000
const TOKEN_TTL_MS = 2 * 60 * 60 * 1000

const hasValidSpotifySession = () => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
  const expiresAtRaw = localStorage.getItem(EXPIRES_AT_KEY)
  const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : 0

  if (token && !expiresAt) {
    localStorage.setItem(EXPIRES_AT_KEY, (Date.now() + TOKEN_TTL_MS).toString())
    return true
  }

  if (token && Date.now() < expiresAt) {
    return true
  }

  const code = sessionStorage.getItem(AUTH_CODE_KEY)
  const codeAtRaw = sessionStorage.getItem(AUTH_CODE_RECEIVED_AT_KEY)
  const codeAt = codeAtRaw ? Number(codeAtRaw) : 0

  return Boolean(code && codeAt && Date.now() - codeAt < AUTH_CODE_TTL_MS)
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/callback',
      name: 'login-callback',
      component: CallbackView,
    },
    {
      path: '/zazam',
      name: 'zazam',
      component: Zazam,
    },
  ],
})

router.beforeEach((to) => {
  if (to.name !== 'zazam') {
    return true
  }

  if (hasValidSpotifySession()) {
    return true
  }

  return { name: 'login' }
})

export default router
