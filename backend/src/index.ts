import { createApp } from "./app.js";
import { env } from "./lib/env.js";

const app = createApp(env.CLIENT_ORIGINS);

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});
