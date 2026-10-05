export type DataClass =
  | "PUBLIC"
  | "INTERNAL"
  | "PII"
  | "FINANCIAL"
  | "TAX"
  | "HEALTH"
  | "SECRET";

export interface PrivacyFinding {
  type: DataClass;
  value: string;
  start: number;
  end: number;
}

export interface PrivacyPolicy {
  externalProviderAllowed: boolean;
  redact: DataClass[];
  deny: DataClass[];
}

export interface PrivacyResult {
  decision: "ALLOW" | "REDACT" | "DENY";
  text: string;
  findings: PrivacyFinding[];
  redactions: Array<{ placeholder: string; originalType: DataClass }>;
  reason?: string;
}

const detectors: Array<{ type: DataClass; pattern: RegExp }> = [
  { type: "SECRET", pattern: /\b(?:sk-[A-Za-z0-9_-]{10,}|ghp_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[A-Z0-9]{16})\b/g },
  { type: "PII", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { type: "PII", pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g },
  { type: "PII", pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
  { type: "FINANCIAL", pattern: /\b(?:\d[ -]*?){13,19}\b/g },
];

export function inspectPrivacy(text: string): PrivacyFinding[] {
  const findings: PrivacyFinding[] = [];
  for (const detector of detectors) {
    detector.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = detector.pattern.exec(text)) !== null) {
      findings.push({
        type: detector.type,
        value: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }
  return findings.sort((a, b) => a.start - b.start);
}

export function applyPrivacyPolicy(text: string, policy: PrivacyPolicy): PrivacyResult {
  const findings = inspectPrivacy(text);

  if (!policy.externalProviderAllowed && findings.length > 0) {
    return {
      decision: "DENY",
      text,
      findings,
      redactions: [],
      reason: "external provider use is disabled for detected sensitive data",
    };
  }

  const denied = findings.find((f) => policy.deny.includes(f.type));
  if (denied) {
    return {
      decision: "DENY",
      text,
      findings,
      redactions: [],
      reason: `policy denies data class ${denied.type}`,
    };
  }

  const redactable = findings.filter((f) => policy.redact.includes(f.type));
  if (!redactable.length) {
    return { decision: "ALLOW", text, findings, redactions: [] };
  }

  let out = text;
  const redactions: PrivacyResult["redactions"] = [];
  for (let i = redactable.length - 1; i >= 0; i -= 1) {
    const finding = redactable[i]!;
    const placeholder = `[REDACTED_${finding.type}_${i + 1}]`;
    out = out.slice(0, finding.start) + placeholder + out.slice(finding.end);
    redactions.push({ placeholder, originalType: finding.type });
  }

  return {
    decision: "REDACT",
    text: out,
    findings,
    redactions: redactions.reverse(),
  };
}
