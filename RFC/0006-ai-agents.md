# RFC 0006: AI providers, agents, and durable workflows

- **Status:** Accepted ✅ (Phase 11–12 direction)
- **Target:** Phase 11 (providers), Phase 12 (agents/workflows)
- **Author:** Qutivex maintainers
- **Created:** 2026-10-26

## Summary

Qutivex provides a **provider-neutral AI interface**, schema-validated
structured output, typed tools, a **bounded agent runtime**, and **durable
workflows** with human approvals. It does not host models and does not replace
maintained provider SDKs.

AI is an optional module. A minimal Qutivex app must never load it.

## Goals

- One API for text generation, streaming, structured output, tools, and
  embeddings.
- Provider adapters with contract tests and explicit fallback policy.
- Safe, observable, resumable agent execution.
- Hard budgets: steps, tokens, wall-clock time, cost, concurrency.
- Human approval for high-impact actions.
- Durable state that survives process restart.
- Evaluation hooks and deterministic mocks.

## Non-goals

- Training, hosting, or serving models.
- A universal abstraction that hides important provider semantics.
- Multi-agent orchestration in the first AI release.
- Browser automation or arbitrary code execution by default.
- Semantic memory as a requirement for 0.8/0.9.
- Logging prompts or outputs by default.

## Provider contract

```ts
interface ModelProvider {
  readonly id: string;
  generate(request: GenerateRequest): Promise<GenerateResult>;
  stream(request: GenerateRequest): AsyncIterable<StreamEvent>;
  embed?(request: EmbedRequest): Promise<EmbedResult>;
}
```

`GenerateRequest` includes messages, model id, temperature, max tokens, tools,
response schema, abort signal, and provider-specific options in a namespaced
bag. The common API documents what is portable; provider-specific options are
available without pretending they are universal.

Adapters: first two or three providers chosen by real demand. Each adapter has:

- Pinned SDK version and recorded compatibility matrix.
- Mock-server contract tests for streaming, tool calls, errors, and usage.
- Normalized error codes with retryability metadata.
- Explicit rate-limit and timeout behavior.
- No hidden retries that duplicate side effects.

## Structured output

```ts
const result = await ai.generate({
  model: "provider:model",
  messages,
  output: userSummarySchema, // Standard Schema adapter
});
// result.output is typed from the schema
```

- Validate provider output against the schema.
- Invalid output is a typed error, never silently coerced.
- Retry policy is explicit and bounded.
- The same schema can appear in OpenAPI where a route returns the output.

## Tools

```ts
const search = tool({
  name: "search_orders",
  description: "Search orders visible to the current user",
  input: searchOrdersSchema,
  permission: "orders.read",
  timeoutMs: 5_000,
  async execute(input, ctx) {
    return ctx.get(ordersService).search(input);
  },
});
```

Rules:

- Inputs and outputs are schema-validated.
- Every tool call is permission-checked.
- Tools have timeouts, cancellation, and bounded retries.
- Tool output is **untrusted data**, never instructions.
- HTTP tools require an allowlist and outbound request limits.
- Database tools use scoped credentials, not the app's superuser connection.
- High-impact tools require human approval.
- Generated code is never executed by default.
- Audit records include actor, tool, arguments fingerprint, outcome, and
  duration—not secrets or full sensitive payloads.

## Agent runtime

```ts
const run = await agent.run({
  input,
  maxSteps: 8,
  maxToolCalls: 4,
  tokenBudget: 20_000,
  wallClockMs: 60_000,
  tools: [search],
});
```

- Bounded loop with explicit stop reasons.
- Separate trusted system configuration from user content.
- Streaming events: tokens, tool call/result, progress, approval request, final.
- Cancellation and timeout propagate to providers and tools.
- Budget exhaustion ends the run with a typed, user-safe reason.
- Model/tool metadata is recorded; sensitive content is not stored by default.
- Recursion depth, concurrent tool calls, and total cost are capped.

## Durable workflows

```ts
const workflow = defineWorkflow({
  name: "refund-request",
  version: 1,
  async run(ctx) {
    const request = await ctx.step("load", () => loadRequest(ctx.input.id));
    const decision = await ctx.waitForApproval("manager", { request });
    if (!decision.approved) return { status: "rejected" };
    return ctx.step("refund", () => issueRefund(request), { idempotencyKey: request.id });
  },
});
```

Requirements:

- Deterministic step names and an explicit workflow version.
- Durable snapshots after each committed step.
- Resume after process restart from the last completed step.
- Pause/resume and human approval checkpoints.
- Idempotency keys for external side effects.
- Failure/compensation policy for steps that already had side effects.
- Workflow version compatibility rules; running instances keep their version.
- Multi-agent collaboration only after single-agent/workflow reliability is
  proven.

## Memory and state

- Thread/conversation storage is an adapter interface.
- Short-term context management is explicit (token budget, trimming policy).
- Optional structured working memory; semantic recall is an adapter.
- User/tenant isolation and retention/deletion policies are mandatory.
- Encryption depends on the storage backend; no false guarantees.
- Do not cache authorization decisions in memory without invalidation design.

## Security

Threats that must be designed for:

- Prompt injection through user content, retrieved documents, or tool output.
- Tool permission bypass and credential escalation.
- Cross-tenant retrieval and memory leakage.
- Secret leakage in prompts, logs, traces, or error messages.
- Runaway loops, cost amplification, and denial of wallet.
- Malicious tool output instructing the agent to exfiltrate data.

Controls:

- Treat all model/tool output as untrusted data.
- Deny-by-default tool permissions; per-agent capability lists.
- Scoped credentials with least privilege.
- Budgets and kill switches per user/tenant/run.
- Redaction of prompts/outputs in logs by default.
- Human approval for irreversible or high-impact actions.
- Evaluation suites for injection and tool misuse.

## Evaluation

- Dataset format for agent/workflow regression tests.
- Tool-use correctness, latency, cost, and quality metrics.
- Mock providers for deterministic CI.
- Recorded provider fixtures with secret scrubbing.
- Regression gates for prompt/workflow changes.
- Evaluation results are evidence, not marketing claims.

## Testing

- Provider adapters against mock HTTP servers.
- Streaming backpressure and client disconnect.
- Structured-output success/invalid/retry exhaustion.
- Tool validation, permission denial, timeout, and cancellation.
- Budget exhaustion and max-step termination.
- Approval pause/resume after simulated restart.
- Prompt-injection and untrusted-tool-output cases.
- Secret redaction in logs/traces/errors.
- Tenant isolation for memory and retrieval.
- Workflow idempotency and recovery.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| Bundle one provider SDK as the API | Locks users in and leaks vendor semantics. |
| Custom model client | Reuse maintained SDKs; normalize above them. |
| Unbounded ReAct loop | Unsafe, expensive, and hard to operate. |
| Durable execution from scratch | Reuse storage primitives; keep the contract narrow. |
| Semantic memory in 0.8 | Distracts from safe, reliable core agent execution. |

## Open questions

- Which two providers ship first, based on user demand.
- Workflow storage backend for 0.9 (PostgreSQL-first likely).
- Tool approval UX in API vs admin.
- How much provider-specific option surface is acceptable.
