<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import type { Credentials } from '@/api/auth'
import { errorMessage } from '@/api/errors'
import CredentialsForm from '@/components/CredentialsForm.vue'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'

const { notify } = useToast()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const pending = ref(false)
const error = ref<string | null>(null)

// Only an in-app path: a crafted ?redirect=https://… must not send the user off-site.
// Without one, an admin lands on what concerns them: the drawings of everybody.
function redirectTarget(): string {
  const target = route.query.redirect
  if (typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')) return target
  return auth.isAdmin ? '/admin' : '/'
}

async function onSubmit(credentials: Credentials): Promise<void> {
  pending.value = true
  error.value = null
  try {
    await auth.login(credentials)
    // The name as the server answered it: it trims and lowercases what was typed.
    // The toast outlives this view, so it is still there after the redirect.
    notify(`Welcome back, ${auth.user?.userName ?? credentials.userName}`)
    await router.replace(redirectTarget())
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main class="flex flex-1 items-center justify-center px-4 py-10">
    <div class="card w-full max-w-sm border border-base-300 bg-base-100">
      <div class="card-body gap-6">
        <h1 class="text-2xl font-semibold">Log in</h1>
        <CredentialsForm mode="login" :pending="pending" :error="error" @submit="onSubmit" />
        <p class="text-sm">
          No account yet?
          <RouterLink class="link link-primary" to="/register">Create one</RouterLink>
        </p>
      </div>
    </div>
  </main>
</template>
