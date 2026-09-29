import type { DecisionRecord, DecisionRequest } from "./contracts.js";
import type { DecisionProvider } from "./decision.js";
import { DecisionEngine } from "./decision.js";

export interface RetrievalItem {
  id: string;
  text: string;
  source: string;
  score: number;
}

export interface RetrievalProvider {
  retrieve(input: { tenantId: string; query: string; limit: number }): Promise<RetrievalItem[]>;
}

export interface ControllerPlan {
  taskId: string;
  decision: DecisionRecord | null;
  context: RetrievalItem[];
  requiresGenerativeController: boolean;
}

export class BrainController {
  constructor(
    private readonly decisionEngine: DecisionEngine,
    private readonly retrieval?: RetrievalProvider,
  ) {}

  async plan(input: {
    tenantId: string;
    taskId: string;
    query: string;
    decision?: DecisionRequest;
    retrievalLimit?: number;
  }): Promise<ControllerPlan> {
    const context = this.retrieval
      ? await this.retrieval.retrieve({
          tenantId: input.tenantId,
          query: input.query,
          limit: input.retrievalLimit ?? 8,
        })
      : [];

    const decision = input.decision
      ? await this.decisionEngine.decide(input.decision)
      : null;

    return {
      taskId: input.taskId,
      decision,
      context,
      requiresGenerativeController: Boolean(
        !decision && (input.decision?.allowedChoices.length ?? 0) > 0,
      ),
    };
  }
}

export class StaticDecisionProvider implements DecisionProvider {
  readonly name = "static";

  constructor(private readonly choice: string | null) {}

  async decide(request: DecisionRequest): Promise<DecisionRecord | null> {
    if (!this.choice || !request.allowedChoices.includes(this.choice)) return null;
    return {
      id: `decision:${request.id}:static`,
      requestId: request.id,
      provider: this.name,
      choice: this.choice,
      confidence: 1,
      createdAt: new Date().toISOString(),
    };
  }
}
