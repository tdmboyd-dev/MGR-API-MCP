import assert from "node:assert/strict";
import test from "node:test";
import { authorizeTool } from "../src/authz.js";
import { BrainController, StaticDecisionProvider } from "../src/brain-controller.js";
import { DecisionEngine } from "../src/decision.js";
import { ValidatingCreationOSClient } from "../src/creation-client.js";

test("authorization binds scopes to the intended resource audience", () => {
  const auth = {
    actorId: "a",
    tenantId: "t",
    audience: "https://api.mgr.test/mcp",
    scopes: ["tools:read", "tools:execute"],
    expiresAt: 200,
  };
  authorizeTool(auth, "https://api.mgr.test/mcp", ["tools:execute"], 100);
  assert.throws(() => authorizeTool(auth, "https://other.mgr.test", ["tools:execute"], 100));
  assert.throws(() => authorizeTool(auth, "https://api.mgr.test/mcp", ["admin"], 100));
  assert.throws(() => authorizeTool(auth, "https://api.mgr.test/mcp", ["tools:execute"], 201));
});

test("Brain controller retrieves context and escalates only when bounded decision cannot resolve", async () => {
  const retrieval = {
    async retrieve() {
      return [{ id: "m1", text: "known fact", source: "memory", score: 0.9 }];
    },
  };

  const resolved = new BrainController(
    new DecisionEngine([], [new StaticDecisionProvider("web_search")]),
    retrieval,
  );
  const ok = await resolved.plan({
    tenantId: "t",
    taskId: "task",
    query: "research this",
    decision: {
      id: "d1",
      taskId: "task",
      questionVersion: "1",
      stateHash: "s",
      allowedChoices: ["web_search", "none"],
      risk: "low",
    },
  });
  assert.equal(ok.decision?.choice, "web_search");
  assert.equal(ok.requiresGenerativeController, false);
  assert.equal(ok.context.length, 1);

  const unresolved = new BrainController(
    new DecisionEngine([], [new StaticDecisionProvider("email_send")]),
  );
  const fallback = await unresolved.plan({
    tenantId: "t",
    taskId: "task",
    query: "research",
    decision: {
      id: "d2",
      taskId: "task",
      questionVersion: "1",
      stateHash: "s",
      allowedChoices: ["web_search"],
      risk: "low",
    },
  });
  assert.equal(fallback.decision, null);
  assert.equal(fallback.requiresGenerativeController, true);
});

test("Creation OS client blocks underspecified requests before transport", async () => {
  let calls = 0;
  const client = new ValidatingCreationOSClient({
    async execute(request) {
      calls += 1;
      return {
        requestId: request.requestId,
        status: "SUCCEEDED",
        artifactRefs: [],
        evidenceRefs: [],
      };
    },
  });

  const result = await client.execute({
    requestId: "r1",
    tenantId: "t",
    workspaceId: "w",
    capability: "media.generate",
    input: {},
    acceptanceCriteria: [],
  });

  assert.equal(result.status, "BLOCKED");
  assert.equal(calls, 0);
});
