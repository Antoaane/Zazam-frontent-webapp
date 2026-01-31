<script lang="ts" setup></script>

<template>
  <div class="h-20 p-2 pl-6 rounded-5xl flex justify-between items-center glass">
    <h1 class="font-title text-[42px] text-primary">Zaza<span>m</span></h1>
    <div class="h-full">
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
