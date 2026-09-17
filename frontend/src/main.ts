import './style.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Resolve the session before the first render, so route guards never see a stale "signed out".
await useAuthStore().restore()

app.mount('#app')
