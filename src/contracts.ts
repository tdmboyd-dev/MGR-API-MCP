export type Id = string;

export type TaskState =
  | "queued"
  | "running"
  | "waiting_approval"
  | "waiting_external"
  | "completed"
  | "failed"
  | "cancelled"
  | "unknown_external_state";

export type JobState =
  | "queued"
  | "running"
  | "waiting_external"
  | "completed"
  | "failed"
  | "cancelled"
  | "unknown_external_state";

export interface Task {
  id: Id;
  tenantId: Id;
  actorId: Id;
  objective: string;
  state: TaskState;
  createdAt: string;
  updatedAt: string;
  budgetId?: Id;
}

export interface Job {
  id: Id;
  taskId: Id;
  capability: string;
  state: JobState;
  idempotencyKey: string;
  attemptCount: number;
  externalOperationId?: string;
}

export interface ToolCapability {
  id: string;
  version: string;
  description: string;
  sideEffect: "none" | "reversible" | "irreversible";
  requiredScopes: string[];
  approvalPolicy: "never" | "policy" | "always";
}

export interface ProviderCapability {
  provider: string;
  modelOrService: string;
  version: string;
  capabilities: string[];
  observedAt: string;
  source: string;
  confidence: number;
  estimatedCost?: {
    currency: string;
    unit: string;
    amount: number;
  };
}

export interface DecisionRequest {
  id: Id;
  taskId: Id;
  questionVersion: string;
  stateHash: string;
  allowedChoices: string[];
  risk: "low" | "medium" | "high";
}

export interface DecisionRecord {
  id: Id;
  requestId: Id;
  provider: string;
  model?: string;
  choice: string;
  confidence?: number;
  reason?: string;
  createdAt: string;
}

export interface Approval {
  id: Id;
  taskId: Id;
  actionDigest: string;
  state: "pending" | "approved" | "denied" | "expired" | "invalidated";
  approvedBy?: Id;
  expiresAt?: string;
}

export interface ExecutionAttempt {
  id: Id;
  jobId: Id;
  toolCapabilityId: string;
  actionDigest: string;
  state: "prepared" | "dispatched" | "succeeded" | "failed" | "unknown";
  startedAt: string;
  finishedAt?: string;
  externalOperationId?: string;
  errorCode?: string;
}

export interface Receipt {
  id: Id;
  executionAttemptId: Id;
  actionDigest: string;
  outcome: "succeeded" | "failed" | "unknown";
  evidence: Record<string, unknown>;
  createdAt: string;
}

export interface Budget {
  id: Id;
  tenantId: Id;
  currency: string;
  limit: number;
  spent: number;
  policy: "warn" | "approval" | "deny";
}

export interface Schedule {
  id: Id;
  taskTemplateId: Id;
  expression: string;
  timezone: string;
  enabled: boolean;
}

export interface Reconciliation {
  id: Id;
  executionAttemptId: Id;
  externalOperationId?: string;
  observedState: "succeeded" | "failed" | "pending" | "not_found" | "unknown";
  observedAt: string;
  evidence: Record<string, unknown>;
}
