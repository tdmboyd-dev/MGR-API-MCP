# Native identifier recovery — November 1, 2026

## Failure and repair

The native admission grammar already accepts letters, digits, underscore, colon, dot and hyphen, including literal `.` and `..`. Existing status/document routes did not consistently recover percent-encoded accepted IDs; URL dot-segment normalization makes literal dot IDs unsuitable for path lookup. Reproduced SignMe baseline: 11 failures / 1 passing malformed-path check. Creation baseline failures are retained in creation-identifiers-red.txt. No identifier grammar narrowing, record migration or replacement ledger was used.

Native SignMe and Creation now decode path identifiers exactly once and reject malformed encodings, decoded separators, NUL and double-encoded invalid IDs. Authenticated, exact-owner body lookup recovers dot-segment IDs without URL normalization. SignMe document snapshot/version-list reads also preserve legacy document identifiers. Versions must be positive safe integers. Creation body control resumes/cancels the original job; repeated cancellation returns its saved descriptor without another cancellation event.

The shared edge retains old safe-path behavior and uses the new native body routes only where required. Before an affected write it verifies native identifierLookupVersion=1 with the exact configured tenant/actor, then rechecks current pre-dispatch authority. An older backend or authority withdrawal admits zero writes. Recovery never invents a fresh request ID or blindly resends an unknown result. Tevin's original HTTP/SQLite/approval/artifact path qualifies the same native services.

## Executed acceptance

| Defined scope | Result |
|---|---|
| SignMe native lifecycle, credentials and identifiers | 35/35 passed, zero skipped |
| Creation complete current local suite | 265/265 passed, zero skipped; typecheck passed |
| Shared edge complete current suite with explicit ONE/Code Monster/native roots | 324/324 passed, zero skipped; typecheck passed |
| Affected ONE actual owner HTTP, command custody, business scope, storage and handoff | 27/27 passed, zero skipped |
| Shared hosted-artifact syntax and plugin checks | Passed; plugin remains unconfigured for hosted MCP |
| Qualified changed implementation/test inputs | All seven SHA256 values unchanged after qualification |

Scopes are separate and must not be summed as whole-product acceptance. See qualified-inputs.json and retained test logs. Published log copies normalize line endings and remove trailing whitespace; original execution logs remain in the local work folder. Real disposable native HTTP/SQLite, saved versions/jobs, lost-response recovery, original approvals, artifacts and reopen were exercised. These fixtures used no new model inference, signing, sending or paid provider.

## Integration and current boundary

This is a compatibility repair within reuse Decision004 and the existing Creation adapter. Native domains retain their own records; ONE retains authority and API-MCP is the shared receiving edge. It supports tools independently and together without another scheduler, grant engine or outside service. Local compute/maintenance cost and monetary savings have not been measured.

Permanent owner activation of this exact source is still pending a separate receipt; earlier permanent SignMe acceptance remains valid for its pinned predecessor source. Full browser/Prisma/UI, generated-content provenance, legal signing/delivery, provider/device/hosted/production acceptance and full thirteen-repository source/quality/cost comparisons remain open. Original requirement registers and existing product scope are unchanged. This report supersedes the pending valid-ID reproduction instruction only, not the full source audit.
