<script lang="ts" setup>
import { computed, ref } from 'vue'

type ItemSwipeAction = 'add-to-queue'

const props = defineProps<{
  imageSrc: string
  title: string
  subtitle: string
  draggable?: boolean
  isFirst?: boolean
  swipeEnabled?: boolean
  swipeDistance?: number
  swipeThreshold?: number
  swipeLag?: number
  swipeAction?: ItemSwipeAction
  swipePayload?: unknown
}>()

const emit = defineEmits<{
  (event: 'swipe', payload: { action: ItemSwipeAction; payload?: unknown }): void
  (event: 'click', eventPayload: MouseEvent): void
}>()

const maxSwipe = computed(() => props.swipeDistance ?? 175)
const swipeThreshold = computed(() => props.swipeThreshold ?? Math.round(maxSwipe.value * 0.7))
const maxLag = computed(() => props.swipeLag ?? 25)

const isDragging = ref(false)
const dragX = ref(0)
const startX = ref(0)
const startY = ref(0)
const pointerId = ref<number | null>(null)
const suppressClick = ref(false)

const itemStyle = computed(() => ({
  transform: `translateX(${dragX.value}px)`,
  transition: isDragging.value ? 'none' : 'transform 180ms ease',
}))

const handlePointerDown = (event: PointerEvent) => {
  if (!props.swipeEnabled || event.button !== 0) {
    return
  }
  pointerId.value = event.pointerId
  startX.value = event.clientX
  startY.value = event.clientY
  dragX.value = 0
  suppressClick.value = false
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

const handlePointerMove = (event: PointerEvent) => {
  if (!props.swipeEnabled || pointerId.value !== event.pointerId) {
    return
  }

  const deltaX = event.clientX - startX.value
  const deltaY = event.clientY - startY.value

  if (!isDragging.value) {
    if (Math.abs(deltaY) > Math.abs(deltaX) || Math.abs(deltaX) < 6) {
      return
    }
    if (deltaX < 0) {
      return
    }
    isDragging.value = true
  }

  if (!isDragging.value) {
    return
  }

  event.preventDefault()
  const clamped = Math.max(0, Math.min(maxSwipe.value, deltaX))
  const lag = maxSwipe.value > 0 ? (clamped / maxSwipe.value) * maxLag.value : 0
  const next = Math.max(0, clamped - lag)
  dragX.value = next
  if (clamped > 6) {
    suppressClick.value = true
  }
}

const finishSwipe = () => {
  if (!props.swipeEnabled) {
    return
  }
  if (isDragging.value && dragX.value >= swipeThreshold.value && props.swipeAction) {
    emit('swipe', { action: props.swipeAction, payload: props.swipePayload })
  }
  isDragging.value = false
  dragX.value = 0
  pointerId.value = null
}

const handlePointerUp = (event: PointerEvent) => {
  if (pointerId.value !== event.pointerId) {
    return
  }
  finishSwipe()
}

const handlePointerCancel = (event: PointerEvent) => {
  if (pointerId.value !== event.pointerId) {
    return
  }
  finishSwipe()
}

const handleClick = (event: MouseEvent) => {
  if (suppressClick.value) {
    event.preventDefault()
    event.stopPropagation()
    suppressClick.value = false
    return
  }
  emit('click', event)
}
</script>

<template>
  <button
    class="item h-19 p-2 flex gap-4 items-center justify-start rounded-xl first-of-type:rounded-t-4xl glass"
    type="button"
    :style="itemStyle"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerCancel"
    @click="handleClick"
  >
    <img
      :src="props.imageSrc"
      :alt="props.title"
      class="h-full aspect-square rounded-md shadow-md"
    />
    <div class="flex flex-col w-full min-w-0">
      <p class="title flex-1 min-w-0 font-medium! text-lg text-primary truncate text-left">
        {{ props.title }}
      </p>
      <p class="subtitle font-base text-sm text-primary/60 text-left truncate">
        {{ props.subtitle }}
      </p>
    </div>
    <button
      v-if="props.draggable && !props.isFirst"
      class="px-3 flex flex-col gap-1 justify-center"
      type="button"
    >
      <span class="w-4 h-0.5 bg-primary/50 rounded-full"></span>
      <span class="w-4 h-0.5 bg-primary/50 rounded-full"></span>
      <span class="w-4 h-0.5 bg-primary/50 rounded-full"></span>
    </button>
    <!-- <button v-if="props.isFirst" class="px-3">
      <Pause v-if="isPlaying" :size="28" />
      <Play v-else :size="28" />
    </button> -->
  </button>
</template>

<style lang="scss">
@use '@/styles/variables/main-vars.scss' as *;

.item {
  touch-action: pan-y;
  user-select: none;

  .pause,
  .play {
    stroke: $secondary;
    display: block;
  }

  &:first-of-type {
    img {
      border-top-left-radius: 1.5rem;
    }
  }
}
</style>
