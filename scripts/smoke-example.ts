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
  status?: string;
}

const server = startServer({ port: 0 });

try {
  const baseUrl = `http://127.0.0.1:${server.port}`;

  const home = await fetch(`${baseUrl}/`);
  assert(home.status === 200, `GET / returned ${home.status}`);
  const homeBody = (await home.json()) as HomeBody;
  assert(
    homeBody.message?.includes("Qutivex") === true,
    "GET / response is missing a Qutivex message",
  );
  assert(homeBody.framework === "Qutivex", "GET / response is missing the framework name");
  assert(homeBody.phase === 1, "GET / response reports an unexpected phase");

  const health = await fetch(`${baseUrl}/health`);
  assert(health.status === 200, `GET /health returned ${health.status}`);
  const healthBody = (await health.json()) as HealthBody;
  assert(healthBody.status === "ok", "GET /health did not report ok");

  const missing = await fetch(`${baseUrl}/missing`);
  assert(missing.status === 404, `GET /missing returned ${missing.status}`);

  console.log(`✓ Example smoke check passed at ${baseUrl}`);
} finally {
  await server.stop(true);
}
