<script setup lang="ts">
import type { DrawingWithAuthor } from "@/api/admin";
import DrawingPreview from "@/components/DrawingPreview.vue";

const props = defineProps<{
  drawing: DrawingWithAuthor;
  playing: boolean;
  /** Only the card being listened to gets one, so the others never repaint. */
  playhead: number | null;
}>();

const emit = defineEmits<{ open: []; listen: []; remove: [] }>();

const who = `${props.drawing.title} by ${props.drawing.userName}`;
</script>

<template>
  <!-- `card` is a class, so the list keeps its semantics and still looks like a card. -->
  <li class="card relative overflow-hidden border border-base-300 bg-base-100">
    <button
      type="button"
      class="cursor-pointer text-left transition-opacity hover:opacity-80"
      @click="emit('open')"
    >
      <DrawingPreview :data="drawing.data" :playhead="playhead" />
      <div class="card-body gap-0 border-t border-base-300 p-3">
        <p class="truncate pr-20 font-semibold">{{ drawing.title }}</p>
        <p class="truncate pr-20 font-mono text-xs text-base-content/70">
          {{ drawing.userName }} · {{ new Date(drawing.updatedAt).toLocaleDateString() }}
        </p>
      </div>
    </button>

    <!-- Siblings of the opening button, not children: a button inside a button is invalid. -->
    <button
      type="button"
      class="btn btn-sm btn-circle absolute right-12 bottom-2 cursor-pointer border-primary bg-base-100 text-primary hover:border-primary hover:bg-primary hover:text-primary-content"
      :aria-pressed="playing"
      :aria-label="playing ? `Stop ${who}` : `Play ${who}`"
      @click="emit('listen')"
    >
      <svg class="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <rect v-if="playing" x="7" y="7" width="10" height="10" rx="1.5" />
        <path
          v-else
          d="M8 5.5v13a1 1 0 0 0 1.53.85l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5z"
        />
      </svg>
    </button>

    <!-- Red, and behind a confirmation: moderation should never be one stray click. -->
    <button
      type="button"
      class="btn btn-sm btn-circle absolute right-2 bottom-2 cursor-pointer border-error bg-base-100 text-error hover:border-error hover:bg-error hover:text-error-content"
      :aria-label="`Delete ${who}`"
      @click="emit('remove')"
    >
      <svg
        class="size-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"
        />
      </svg>
    </button>
  </li>
</template>
