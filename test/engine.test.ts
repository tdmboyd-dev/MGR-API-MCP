import assert from "node:assert/strict";
import test from "node:test";
import { DecisionEngine } from "../src/decision.js";
import { InMemoryTaskEngine } from "../src/engine.js";

test("idempotent job creation returns the same job and rejects key reuse for a different capability", () => {
  const engine = new InMemoryTaskEngine();
  const task = engine.createTask({ tenantId: "t1", actorId: "a1", objective: "research" });

  const first = engine.createJob({
    taskId: task.id,
    capability: "research.collect",
    idempotencyKey: "task-1:research.collect",
  });
  const second = engine.createJob({
    taskId: task.id,
    capability: "research.collect",
    idempotencyKey: "task-1:research.collect",
  });

  assert.equal(first.id, second.id);
  assert.throws(() => engine.createJob({
    taskId: task.id,
    capability: "publish",
    idempotencyKey: "task-1:research.collect",
  }));
});

test("approval digest invalidates when the action changes", () => {
  const engine = new InMemoryTaskEngine();
  const task = engine.createTask({ tenantId: "t1", actorId: "a1", objective: "publish" });
  const action = { tool: "publish", assetId: "a1", destination: "site" };
  const approval = engine.createApproval(task.id, action);

  assert.throws(() => engine.approve(approval.id, "owner", { ...action, assetId: "a2" }));
});

test("deterministic decision provider can only choose from allowed choices", async () => {
  const engine = new DecisionEngine([
    {
      id: "research-default",
      matches: (request) => request.risk === "low",
      choose: () => "web_search",
    },
  ]);

  const result = await engine.decide({
    id: "d1",
    taskId: "t1",
    questionVersion: "1",
    stateHash: "abc",
    allowedChoices: ["web_search", "none"],
    risk: "low",
  });
  assert.equal(result?.choice, "web_search");

  const blocked = await engine.decide({
    id: "d2",
    taskId: "t1",
    questionVersion: "1",
    stateHash: "abc",
    allowedChoices: ["none"],
    risk: "low",
  });
  assert.equal(blocked, null);
});
