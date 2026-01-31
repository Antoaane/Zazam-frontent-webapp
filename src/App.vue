<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, RouterView } from 'vue-router'

const route = useRoute()
</script>

<template>
  <div class="background">
    <svg class="noise" viewBox="0 0 500 500" preserveAspectRatio="none">
      <filter id="noiseFilter">
        <feTurbulence baseFrequency="3" numOctaves="4" result="noise" type="fractalNoise" />
        <feColorMatrix in="noise" result="grayscale" type="saturate" values="0" />
        <feComponentTransfer in="grayscale" result="grain">
          <feFuncA tableValues="1 0" type="discrete" />
        </feComponentTransfer>
        <feComposite in="grain" in2="SourceAlpha" operator="in" result="maskedGrain" />
        <feMerge><feMergeNode in="maskedGrain" /></feMerge>
      </filter>

      <rect width="100%" height="100%" filter="url(#noiseFilter)" />
    </svg>
  </div>
  <div class="main-container">
    <RouterView />
  </div>
</template>

<style lang="scss">
@use '@/styles/variables/main-vars.scss' as *;

#app {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;

  .background {
    width: 100%;
    height: 100%;

    position: absolute;
    z-index: -1;
    inset: 0;

    background: radial-gradient(160% 125% at 150% -20%, $accent 0%, $secondary 100%), $secondary;

    .noise {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;

      opacity: 0.25;
      mix-blend-mode: overlay;
      pointer-events: none;

      backdrop-filter: blur(200px);
    }
  }

  .main-container {
    height: 100%;
    padding: 0.75rem;

    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
}
</style>
