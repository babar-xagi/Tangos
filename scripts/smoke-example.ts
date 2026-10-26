import { startServer } from "../examples/hello/src/server";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Example smoke check failed: ${message}`);
  }
}

interface HomeBody {
  message?: string;
  framework?: string;
  phase?: number;
}

interface HealthBody {
  phase?: number;
  status?: string;
}

const { app, info } = await startServer({ port: 0 });

try {
  const baseUrl = info.url.href;

  const home = await fetch(baseUrl);
  assert(home.status === 200, `GET / returned ${home.status}`);
  const homeBody = (await home.json()) as HomeBody;
  assert(homeBody.message?.includes("Qutivex") === true, "GET / is missing a Qutivex message");
  assert(homeBody.framework === "Qutivex", "GET / is missing the framework name");
  assert(homeBody.phase === 2, "GET / reports an unexpected phase");

  const health = await fetch(new URL("health", baseUrl));
  assert(health.status === 200, `GET /health returned ${health.status}`);
  const healthBody = (await health.json()) as HealthBody;
  assert(healthBody.status === "ok", "GET /health did not report ok");
  assert(healthBody.phase === 2, "GET /health reports an unexpected phase");

  const missing = await fetch(new URL("missing", baseUrl));
  assert(missing.status === 404, `GET /missing returned ${missing.status}`);

  const head = await fetch(new URL("health", baseUrl), { method: "HEAD" });
  assert(head.status === 200, `HEAD /health returned ${head.status}`);
  assert((await head.text()) === "", "HEAD /health returned a body");

  console.log(`✓ Example smoke check passed at ${baseUrl}`);
} finally {
  await app.stop(true);
}
