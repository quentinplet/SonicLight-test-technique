import "./style.css";
import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import { i18n } from "./i18n";
import router from "./router";
import { useAuthStore } from "./stores/auth";

const app = createApp(App);

app.use(createPinia());
app.use(i18n);

// Before app.use(router): installing the router starts the first navigation right away, and
// its guard would see a stale "signed out" and redirect to /login on every reload.
await useAuthStore().restore();

app.use(router);
app.mount("#app");
