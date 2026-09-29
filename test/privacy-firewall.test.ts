import assert from "node:assert/strict";
import test from "node:test";
import { applyPrivacyPolicy } from "../src/privacy-firewall.js";

test("privacy firewall redacts email and phone before external inference", () => {
  const result = applyPrivacyPolicy(
    "Email me at user@example.com or call 901-555-1212",
    {
      externalProviderAllowed: true,
      redact: ["PII"],
      deny: ["SECRET"],
    },
  );
  assert.equal(result.decision, "REDACT");
  assert.equal(result.text.includes("user@example.com"), false);
  assert.equal(result.text.includes("901-555-1212"), false);
});

test("privacy firewall blocks detected secrets", () => {
  const result = applyPrivacyPolicy(
    "token sk-abcdefghijklmnopqrstuvwxyz",
    {
      externalProviderAllowed: true,
      redact: ["PII"],
      deny: ["SECRET"],
    },
  );
  assert.equal(result.decision, "DENY");
});

test("privacy firewall can deny all sensitive external routing", () => {
  const result = applyPrivacyPolicy(
    "user@example.com",
    {
      externalProviderAllowed: false,
      redact: ["PII"],
      deny: [],
    },
  );
  assert.equal(result.decision, "DENY");
});
