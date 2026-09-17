import type { Express } from "express";

export interface TestServer {
  url: string;
  close: () => void;
}

/** Listens on an ephemeral port, so tests exercise real HTTP without a fixed port. */
export async function startServer(app: Express): Promise<TestServer> {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("expected a TCP address");
  return { url: `http://localhost:${address.port}`, close: () => server.close() };
}
