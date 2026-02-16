import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '@/views/Landing/LoginView.vue'
import CallbackView from '@/views/Landing/CallbackView.vue'
import Zazam from '@/views/Zazam/Zazam.vue'
import { hasValidSession } from '@/domain/auth/AuthSession'

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

  if (hasValidSession()) {
    return true
  }

  return { name: 'login' }
})

export default router
