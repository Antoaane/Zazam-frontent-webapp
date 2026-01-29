import { createRouter, createWebHistory } from 'vue-router'
import Zazam from '@/views/Zazam/Zazam.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'zazam',
      component: Zazam,
    },
  ],
})

export default router
