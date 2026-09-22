<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { LOCALES, setLocale } from "@/i18n";

const { locale } = useI18n();

// vue-i18n types `locale` as a plain string, so it is narrowed here rather than cast.
const isFrench = computed(() => locale.value === "fr");
const name = computed(() => (isFrench.value ? LOCALES.fr : LOCALES.en));

function flip(): void {
  setLocale(isFrench.value ? "en" : "fr");
}
</script>

<template>
  <!-- A real <label> wrapping a real checkbox: the whole thing is clickable, and the
       keyboard gets space-to-toggle for free. -->
  <label class="flex cursor-pointer items-center gap-2 font-mono text-xs uppercase">
    <span :class="isFrench ? 'opacity-40' : 'opacity-100'" aria-hidden="true">en</span>
    <input
      class="toggle toggle-sm"
      type="checkbox"
      :checked="isFrench"
      :aria-label="`Language — ${name}`"
      @change="flip"
    />
    <span :class="isFrench ? 'opacity-100' : 'opacity-40'" aria-hidden="true">fr</span>
  </label>
</template>
