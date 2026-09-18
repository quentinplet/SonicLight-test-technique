import './style.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

const app = createApp(App)

app.use(createPinia())

// Before app.use(router): installing the router starts the first navigation right away, and
// its guard would see a stale "signed out" and redirect to /login on every reload.
await useAuthStore().restore()

app.use(router)
app.mount('#app')
