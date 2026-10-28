# Tevin usage — MGR-API-MCP

## Use it when

The owner needs this domain: Authenticated API and MCP edge; routes to domain owners.

## Do not use it when

No second business or brain database; no token passthrough; a configured transport is not a live successful connection.

## Example journey

1. Confirm owner request and selected workspace. Read the source-pinned descriptor.
2. Establish an actual authenticated transport and capability/grant; catalog presence is insufficient.
3. Build input: Verified caller token; exact action/input, tenant, actor, correlation and idempotency identifiers.
4. Preview/approve the exact effect when required by existing deterministic policy.
5. Dispatch through the domain owner once; preserve operation identity.
6. Check output: Protocol responses, authoritative downstream receipts, denied/approval-required/unknown states and read-only catalog.
7. On ambiguous response query the original receipt, then reconcile. On cancellation stop owned work and preserve any accepted effect.

## Failure responses

- Not configured: say the domain is not connected; do not fabricate an output.
- Denied/expired grant: preserve the proposal; request the exact missing authority through the existing owner flow.
- Queued/running: report that state with its operation ID, not completed.
- Lost response: report unknown outcome and reconcile original operation; do not blindly resend.
- Missing/invalid artifact or receipt: reject completion and retain failure evidence.

## Training admission

This is source-grounded operational documentation, not model training. Keep exact repo/commit/source lineage and distinguish current source, test receipt, historical claim, proposal, synthetic example and fictional canon. Do not admit credentials, customer data, generated biographies, fabricated metrics or planned capabilities as factual achievements.
