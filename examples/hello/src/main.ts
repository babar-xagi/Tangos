import { parsePort, startServer } from "./server";

const server = startServer({ port: parsePort(Bun.env.PORT) });

console.log(`Qutivex Phase 1 example listening at ${server.url}`);
console.log("Try: curl http://127.0.0.1:3000/");
