import { createApp, parsePort } from "./server";

const app = createApp();

await app.run({ port: parsePort(Bun.env.PORT) });
