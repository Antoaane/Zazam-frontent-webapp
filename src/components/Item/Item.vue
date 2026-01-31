<script lang="ts" setup>
const props = defineProps<{
  imageSrc: string
  title: string
  subtitle: string
  draggable?: boolean
}>()
</script>

<template>
  <button
    class="item h-20 p-2.5 flex gap-4 items-center justify-start rounded-xl first-of-type:rounded-t-4xl glass"
  >
    <img
      :src="props.imageSrc"
      :alt="props.title"
      class="h-full aspect-square rounded-full shadow-md"
    />
    <div class="flex flex-col w-full min-w-0">
      <p class="flex-1 min-w-0 font-medium! text-lg text-primary truncate text-left">
        {{ props.title }}
      </p>
      <p class="font-base text-sm text-primary/60 text-left">{{ props.subtitle }}</p>
    </div>
    <button v-if="props.draggable" class="px-3 flex flex-col gap-1 justify-center">
      <span class="w-4 h-0.5 bg-primary/50 rounded-full"></span>
      <span class="w-4 h-0.5 bg-primary/50 rounded-full"></span>
      <span class="w-4 h-0.5 bg-primary/50 rounded-full"></span>
    </button>
  </button>
</template>
