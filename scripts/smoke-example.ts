import { startServer } from "../examples/hello/src/server";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Example smoke check failed: ${message}`);
  }
}

interface HomeBody {
  message?: string;
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
  assert(homeBody.phase === 3, "GET / reports an unexpected phase");
  assert(home.headers.get("x-response-time-ms") !== null, "middleware header is missing");

  const health = await fetch(new URL("health", baseUrl));
  assert(health.status === 200, `GET /health returned ${health.status}`);
  const healthBody = (await health.json()) as HealthBody;
  assert(healthBody.status === "ok", "GET /health did not report ok");
  assert(healthBody.phase === 3, "GET /health reports an unexpected phase");

  const hello = await fetch(new URL("hello/Ada?greeting=Welcome", baseUrl));
  assert(hello.status === 200, `GET /hello/Ada returned ${hello.status}`);
  assert(
    ((await hello.json()) as { greeting?: string }).greeting === "Welcome, Ada! 👋",
    "path/query params are wrong",
  );

  const echo = await fetch(new URL("echo", baseUrl), {
    body: JSON.stringify({ message: "ping" }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  assert(echo.status === 200, `POST /echo returned ${echo.status}`);
  assert(
    ((await echo.json()) as { echo?: { message?: string } }).echo?.message === "ping",
    "JSON body parsing failed",
  );

  const version = await fetch(new URL("api/version", baseUrl));
  assert(version.status === 200, `GET /api/version returned ${version.status}`);

  const events = await fetch(new URL("events", baseUrl));
  assert(
    events.headers.get("content-type")?.includes("text/event-stream") === true,
    "SSE content type is wrong",
  );
  assert((await events.text()).includes("Qutivex SSE"), "SSE body is missing");

  const missing = await fetch(new URL("missing", baseUrl));
  assert(missing.status === 404, `GET /missing returned ${missing.status}`);

  const head = await fetch(new URL("health", baseUrl), { method: "HEAD" });
  assert(head.status === 200, `HEAD /health returned ${head.status}`);
  assert((await head.text()) === "", "HEAD /health returned a body");

  console.log(`✓ Example smoke check passed at ${baseUrl}`);
} finally {
  await app.stop(true);
}
