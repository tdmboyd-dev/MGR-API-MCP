export interface CreationCapabilityRequest {
  requestId: string;
  tenantId: string;
  workspaceId: string;
  capability: string;
  input: unknown;
  acceptanceCriteria: string[];
  maxCost?: number;
}

export interface CreationCapabilityResult {
  requestId: string;
  status: "SUCCEEDED" | "FAILED" | "BLOCKED";
  artifactRefs: string[];
  evidenceRefs: string[];
  blockers?: string[];
}

export interface CreationOSClient {
  execute(request: CreationCapabilityRequest): Promise<CreationCapabilityResult>;
}

export class ValidatingCreationOSClient implements CreationOSClient {
  constructor(private readonly transport: CreationOSClient) {}

  async execute(request: CreationCapabilityRequest): Promise<CreationCapabilityResult> {
    if (!request.capability.trim()) throw new Error("creation capability is required");
    if (!request.acceptanceCriteria.length) {
      return {
        requestId: request.requestId,
        status: "BLOCKED",
        artifactRefs: [],
        evidenceRefs: [],
        blockers: ["creation request requires acceptance criteria"],
      };
    }

    const result = await this.transport.execute(request);
    if (result.requestId !== request.requestId) {
      throw new Error("Creation OS returned a mismatched request id");
    }
    return result;
  }
}
