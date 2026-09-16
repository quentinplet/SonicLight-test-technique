import cors from "cors";
import express from "express";

import { env } from "./lib/env.js";
import { healthRouter } from "./routes/health.routes.js";

const app = express();

app.use(cors({ origin: env.CLIENT_ORIGINS }));
app.use(express.json());

app.use("/api", healthRouter);

app.listen(env.PORT, () => {
  console.log(`SonicLight API listening on http://localhost:${env.PORT}`);
});
