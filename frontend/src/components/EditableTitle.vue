<script setup lang="ts">
import { computed, nextTick, ref } from "vue";

const title = defineModel<string>({ required: true });
const props = defineProps<{ placeholder: string }>();

const editing = ref(false);
const input = ref<HTMLInputElement | null>(null);

// `size` is in characters: the field fits its text instead of the canvas width.
const size = computed(() =>
  Math.min(40, Math.max(12, (title.value || props.placeholder).length + 1)),
);

async function edit(): Promise<void> {
  editing.value = true;
  await nextTick();
  input.value?.select();
}

// Leaving it blank is meaningful: the server then keeps the title already saved.
function stopEditing(): void {
  editing.value = false;
  title.value = title.value.trim();
}
</script>

<template>
  <div class="flex">
    <input
      v-if="editing"
      ref="input"
      v-model="title"
      class="input input-sm input-ghost w-auto min-w-0 max-w-full px-0 text-xl font-semibold"
      type="text"
      maxlength="50"
      :size="size"
      :placeholder="props.placeholder"
      aria-label="Drawing title"
      @blur="stopEditing"
      @keydown.enter="stopEditing"
      @keydown.esc="stopEditing"
    />

    <!-- A button, not a div: clickable and reachable with the keyboard for free. -->
    <button
      v-else
      class="group flex max-w-full cursor-text items-center gap-1.5 pr-2 text-xl font-semibold hover:opacity-70"
      type="button"
      :aria-label="`Rename drawing, currently ${title || props.placeholder}`"
      @click="edit"
    >
      <span class="truncate">{{ title || props.placeholder }}</span>
      <svg
        class="size-4 shrink-0 opacity-50 transition-opacity group-hover:opacity-100"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83l3.75 3.75z"
        />
      </svg>
    </button>
  </div>
</template>
