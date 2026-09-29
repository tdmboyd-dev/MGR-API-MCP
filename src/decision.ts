import type { DecisionRecord, DecisionRequest } from "./contracts.js";

export interface DecisionProvider {
  readonly name: string;
  decide(request: DecisionRequest): Promise<DecisionRecord | null>;
}

export interface DeterministicDecisionRule {
  id: string;
  matches(request: DecisionRequest): boolean;
  choose(request: DecisionRequest): string | null;
}

export class DecisionEngine {
  constructor(
    private readonly rules: DeterministicDecisionRule[] = [],
    private readonly providers: DecisionProvider[] = [],
  ) {}

  async decide(request: DecisionRequest): Promise<DecisionRecord | null> {
    if (request.allowedChoices.length === 0) return null;

    for (const rule of this.rules) {
      if (!rule.matches(request)) continue;
      const choice = rule.choose(request);
      if (!choice || !request.allowedChoices.includes(choice)) continue;
      return {
        id: `decision:${request.id}:rule:${rule.id}`,
        requestId: request.id,
        provider: `rule:${rule.id}`,
        choice,
        confidence: 1,
        createdAt: new Date().toISOString(),
      };
    }

    for (const provider of this.providers) {
      const result = await provider.decide(request);
      if (!result) continue;
      if (!request.allowedChoices.includes(result.choice)) continue;
      return result;
    }

    return null;
  }
}
