import { randomUUID } from "node:crypto";
import type { Approval, Job, Receipt, Task } from "./contracts.js";
import { actionDigest } from "./security.js";
import { assertJobTransition, assertTaskTransition } from "./state.js";

export const TASK_ENGINE_AUTHORITY = "edge_session_only" as const;

/**
 * Ephemeral orchestration state for an API/MCP session.
 *
 * This engine is deliberately NOT a business system of record. CRM, tax,
 * workflow, communications and authoritative Action Receipt state belong to
 * MGR Legacy; creation-domain authority belongs to Creation OS.
 */
export class InMemoryTaskEngine {
  readonly authority = TASK_ENGINE_AUTHORITY;

  private readonly tasks = new Map<string, Task>();
  private readonly jobs = new Map<string, Job>();
  private readonly approvals = new Map<string, Approval>();
  private readonly receipts = new Map<string, Receipt>();
  private readonly idempotency = new Map<string, string>();

  createTask(input: Omit<Task, "id" | "state" | "createdAt" | "updatedAt"> & { id?: string }): Task {
    const now = new Date().toISOString();
    const task: Task = {
      id: input.id ?? randomUUID(),
      tenantId: input.tenantId,
      actorId: input.actorId,
      objective: input.objective,
      state: "queued",
      createdAt: now,
      updatedAt: now,
      ...(input.budgetId ? { budgetId: input.budgetId } : {}),
    };
    this.tasks.set(task.id, task);
    return structuredClone(task);
  }

  getTask(id: string): Task | null {
    const task = this.tasks.get(id);
    return task ? structuredClone(task) : null;
  }

  transitionTask(id: string, next: Task["state"]): Task {
    const current = this.requireTask(id);
    assertTaskTransition(current.state, next);
    const updated: Task = { ...current, state: next, updatedAt: new Date().toISOString() };
    this.tasks.set(id, updated);
    return structuredClone(updated);
  }

  createJob(input: Omit<Job, "id" | "state" | "attemptCount"> & { id?: string }): Job {
    const task = this.requireTask(input.taskId);
    const idempotencyNamespace = `${task.tenantId}:${input.idempotencyKey}`;
    const existingId = this.idempotency.get(idempotencyNamespace);
    if (existingId) {
      const existing = this.jobs.get(existingId);
      if (!existing) throw new Error("Idempotency index is corrupt");
      if (existing.taskId !== input.taskId || existing.capability !== input.capability) {
        throw new Error("Idempotency key reused with a different job");
      }
      return structuredClone(existing);
    }

    const job: Job = {
      id: input.id ?? randomUUID(),
      taskId: input.taskId,
      capability: input.capability,
      state: "queued",
      idempotencyKey: input.idempotencyKey,
      attemptCount: 0,
      ...(input.externalOperationId ? { externalOperationId: input.externalOperationId } : {}),
    };
    this.jobs.set(job.id, job);
    this.idempotency.set(idempotencyNamespace, job.id);
    return structuredClone(job);
  }

  transitionJob(id: string, next: Job["state"]): Job {
    const current = this.requireJob(id);
    assertJobTransition(current.state, next);
    const updated: Job = {
      ...current,
      state: next,
      attemptCount: next === "running" ? current.attemptCount + 1 : current.attemptCount,
    };
    this.jobs.set(id, updated);
    return structuredClone(updated);
  }

  createApproval(taskId: string, action: unknown, expiresAt?: string): Approval {
    this.requireTask(taskId);
    const approval: Approval = {
      id: randomUUID(),
      taskId,
      actionDigest: actionDigest(action),
      state: "pending",
      ...(expiresAt ? { expiresAt } : {}),
    };
    this.approvals.set(approval.id, approval);
    return structuredClone(approval);
  }

  approve(approvalId: string, actorId: string, action: unknown): Approval {
    const approval = this.requireApproval(approvalId);
    if (approval.state !== "pending") throw new Error(`Approval is ${approval.state}`);
    if (approval.expiresAt && Date.parse(approval.expiresAt) <= Date.now()) {
      const expired: Approval = { ...approval, state: "expired" };
      this.approvals.set(approvalId, expired);
      throw new Error("Approval expired");
    }
    if (actionDigest(action) !== approval.actionDigest) {
      const invalidated: Approval = { ...approval, state: "invalidated" };
      this.approvals.set(approvalId, invalidated);
      throw new Error("Approved action payload changed");
    }
    const approved: Approval = { ...approval, state: "approved", approvedBy: actorId };
    this.approvals.set(approvalId, approved);
    return structuredClone(approved);
  }

  /**
   * Records only edge/session execution evidence. Authoritative business Action
   * Receipts are written and queried through MGR Legacy.
   */
  recordReceipt(input: Omit<Receipt, "id" | "createdAt"> & { id?: string }): Receipt {
    const receipt: Receipt = {
      id: input.id ?? randomUUID(),
      executionAttemptId: input.executionAttemptId,
      actionDigest: input.actionDigest,
      outcome: input.outcome,
      evidence: structuredClone(input.evidence),
      createdAt: new Date().toISOString(),
    };
    this.receipts.set(receipt.id, receipt);
    return structuredClone(receipt);
  }

  private requireTask(id: string): Task {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task not found: ${id}`);
    return task;
  }

  private requireJob(id: string): Job {
    const job = this.jobs.get(id);
    if (!job) throw new Error(`Job not found: ${id}`);
    return job;
  }

  private requireApproval(id: string): Approval {
    const approval = this.approvals.get(id);
    if (!approval) throw new Error(`Approval not found: ${id}`);
    return approval;
  }
}
