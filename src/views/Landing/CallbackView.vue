<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()

const AUTH_CODE_KEY = 'spotify_auth_code'
const AUTH_CODE_RECEIVED_AT_KEY = 'spotify_auth_code_received_at'

onMounted(() => {
  const code = typeof route.query.code === 'string' ? route.query.code : ''

  if (code) {
    sessionStorage.setItem(AUTH_CODE_KEY, code)
    sessionStorage.setItem(AUTH_CODE_RECEIVED_AT_KEY, Date.now().toString())
  }

  void router.replace({ name: 'zazam' })
})
</script>

<template>
  <section class="flex-1 flex items-center justify-center">
    <div class="glass rounded-5xl px-6 py-4">
      <p class="font-base text-sm text-primary/80">Connexion en cours...</p>
    </div>
  </section>
</template>
