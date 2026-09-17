<script setup lang="ts">
import { reactive } from 'vue'
import type { Credentials } from '@/api/auth'

const props = defineProps<{
  mode: 'login' | 'register'
  pending: boolean
  error: string | null
}>()

const emit = defineEmits<{ submit: [credentials: Credentials] }>()

const form = reactive<Credentials>({ userName: '', password: '' })

// Format rules live on the server only: its validation messages are shown as is.
const isRegister = props.mode === 'register'
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="emit('submit', { ...form })">
    <fieldset class="fieldset">
      <label class="label" for="userName">User name</label>
      <input
        id="userName"
        v-model="form.userName"
        class="input w-full"
        type="text"
        autocomplete="username"
        autocapitalize="none"
        required
      />

      <label class="label mt-2" for="password">Password</label>
      <input
        id="password"
        v-model="form.password"
        class="input w-full"
        type="password"
        :autocomplete="isRegister ? 'new-password' : 'current-password'"
        required
      />
    </fieldset>

    <div v-if="error" role="alert" class="alert alert-error alert-soft">{{ error }}</div>

    <button class="btn btn-primary w-full" type="submit" :disabled="pending">
      <span v-if="pending" class="loading loading-spinner loading-sm" aria-hidden="true" />
      {{ isRegister ? 'Create account' : 'Log in' }}
    </button>
  </form>
</template>
