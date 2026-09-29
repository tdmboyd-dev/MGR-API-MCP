import type { JobState, TaskState } from "./contracts.js";

const taskTransitions: Record<TaskState, readonly TaskState[]> = {
  queued: ["running", "cancelled"],
  running: ["waiting_approval", "waiting_external", "completed", "failed", "cancelled", "unknown_external_state"],
  waiting_approval: ["running", "failed", "cancelled"],
  waiting_external: ["running", "completed", "failed", "cancelled", "unknown_external_state"],
  unknown_external_state: ["running", "completed", "failed", "cancelled"],
  completed: [],
  failed: [],
  cancelled: [],
};

const jobTransitions: Record<JobState, readonly JobState[]> = {
  queued: ["running", "cancelled"],
  running: ["waiting_external", "completed", "failed", "cancelled", "unknown_external_state"],
  waiting_external: ["running", "completed", "failed", "cancelled", "unknown_external_state"],
  unknown_external_state: ["running", "completed", "failed", "cancelled"],
  completed: [],
  failed: [],
  cancelled: [],
};

export function canTransitionTask(from: TaskState, to: TaskState): boolean {
  return taskTransitions[from].includes(to);
}

export function canTransitionJob(from: JobState, to: JobState): boolean {
  return jobTransitions[from].includes(to);
}

export function assertTaskTransition(from: TaskState, to: TaskState): void {
  if (!canTransitionTask(from, to)) {
    throw new Error(`Invalid task transition: ${from} -> ${to}`);
  }
}

export function assertJobTransition(from: JobState, to: JobState): void {
  if (!canTransitionJob(from, to)) {
    throw new Error(`Invalid job transition: ${from} -> ${to}`);
  }
}
