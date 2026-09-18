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
  <div class="flex justify-center">
    <input
      v-if="editing"
      ref="input"
      v-model="title"
      class="input input-sm input-ghost w-auto text-center text-xl font-semibold"
      type="text"
      maxlength="80"
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
      class="max-w-full cursor-text truncate px-2 text-xl font-semibold hover:opacity-70"
      type="button"
      :aria-label="`Rename drawing, currently ${title || props.placeholder}`"
      @click="edit"
    >
      {{ title || props.placeholder }}
    </button>
  </div>
</template>
