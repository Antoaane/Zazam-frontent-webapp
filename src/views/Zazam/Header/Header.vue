<script lang="ts" setup>
import { useRouter } from 'vue-router'
import { LogOut } from 'lucide-vue-next'

const router = useRouter()

const logout = () => {
  localStorage.removeItem('spotify_access_token')
  localStorage.removeItem('spotify_token_expires_at')
  sessionStorage.removeItem('spotify_auth_code')
  sessionStorage.removeItem('spotify_auth_code_received_at')
  void router.replace({ name: 'login' })
}
</script>

<template>
  <div class="h-20 p-2 pl-6 rounded-5xl flex justify-between items-center glass">
    <h1 class="font-title text-[42px] text-primary">Zaza<span>m</span></h1>
    <div class="h-full flex items-center gap-2">
      <button
        class="logout h-8 w-8 flex items-center justify-center rounded-full border border-primary/30 text-primary/60 hover:text-primary hover:border-primary/60 transition"
        type="button"
        aria-label="Se déconnecter"
        @click="logout"
      >
        <LogOut :size="16" />
      </button>
      <div class="h-full p-1.5 flex gap-1.5 bg-primary rounded-full">
        <img src="/pictos/spotify.svg" alt="spotify logo" />
        <img
          src="/images/test/pp.png"
          alt="profile picture"
          class="h-full w-auto aspect-square rounded-full shadow-md"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
h1 > span {
  font-feature-settings: 'salt' on;
}
</style>
