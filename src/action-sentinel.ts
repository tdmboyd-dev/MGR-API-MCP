import type { Approval, ToolCapability } from "./contracts.js";
import { actionDigest } from "./security.js";
import type { AuthContext } from "./authz.js";
import { authorizeTool } from "./authz.js";

export type ActionRisk = "low" | "medium" | "high" | "critical";

export interface ProposedAction {
  taskId: string;
  tool: ToolCapability;
  payload: unknown;
  audience: string;
  risk: ActionRisk;
}

export interface SentinelDecision {
  actionDigest: string;
  state: "ALLOW" | "DENY" | "REQUIRE_APPROVAL";
  reason: string;
}

export class ActionSentinel {
  evaluate(
    auth: AuthContext,
    action: ProposedAction,
    approval?: Approval,
    now = Date.now(),
  ): SentinelDecision {
    const digest = actionDigest({
      taskId: action.taskId,
      tool: action.tool.id,
      version: action.tool.version,
      payload: action.payload,
      audience: action.audience,
    });

    try {
      authorizeTool(auth, action.audience, action.tool.requiredScopes, now);
    } catch (error) {
      return {
        actionDigest: digest,
        state: "DENY",
        reason: error instanceof Error ? error.message : "authorization failed",
      };
    }

    const requiresApproval =
      action.tool.approvalPolicy === "always" ||
      (action.tool.approvalPolicy === "policy" &&
        (action.risk === "high" || action.risk === "critical" || action.tool.sideEffect === "irreversible"));

    if (!requiresApproval) {
      return { actionDigest: digest, state: "ALLOW", reason: "policy allows bounded execution" };
    }

    if (!approval) {
      return { actionDigest: digest, state: "REQUIRE_APPROVAL", reason: "approval required by policy" };
    }

    if (approval.state !== "approved") {
      return { actionDigest: digest, state: "REQUIRE_APPROVAL", reason: `approval is ${approval.state}` };
    }

    if (approval.actionDigest !== digest) {
      return { actionDigest: digest, state: "DENY", reason: "approval digest does not match proposed action" };
    }

    if (approval.expiresAt && Date.parse(approval.expiresAt) <= now) {
      return { actionDigest: digest, state: "DENY", reason: "approval expired" };
    }

    return { actionDigest: digest, state: "ALLOW", reason: "exact approved action" };
  }
}
