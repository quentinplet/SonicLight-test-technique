<script setup lang="ts">
import { ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import type { Credentials } from "@/api/auth";
import { errorMessage } from "@/api/errors";
import CredentialsForm from "@/components/CredentialsForm.vue";
import { useToast } from "@/composables/useToast";
import { useAuthStore } from "@/stores/auth";

const { t } = useI18n();

const { notify } = useToast();
const auth = useAuthStore();
const router = useRouter();

const pending = ref(false);
const error = ref<string | null>(null);

function landingPage(): string {
  return auth.isAdmin ? "/admin" : "/";
}

async function onSubmit(credentials: Credentials): Promise<void> {
  pending.value = true;
  error.value = null;
  try {
    await auth.login(credentials);
    notify(t("auth.signedIn"));
    await router.replace(landingPage());
  } catch (err) {
    error.value = errorMessage(err);
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <main class="flex flex-1 items-center justify-center px-4 py-10">
    <div class="card w-full max-w-sm border border-base-300 bg-base-100">
      <div class="card-body gap-6">
        <h1 class="text-2xl font-semibold">{{ t("auth.logInTitle") }}</h1>
        <CredentialsForm mode="login" :pending="pending" :error="error" @submit="onSubmit" />
        <p class="text-sm">
          {{ t("auth.noAccountYet") }}
          <RouterLink class="link link-primary" to="/register">
            {{ t("auth.createOne") }}
          </RouterLink>
        </p>
      </div>
    </div>
  </main>
</template>
