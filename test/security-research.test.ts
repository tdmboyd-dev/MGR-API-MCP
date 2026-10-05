import test from "node:test";
import assert from "node:assert/strict";
import { SECURITY_RESEARCH_SOURCES, validateSecurityFinding } from "../src/security-research.js";

test("FreeBuf is explicitly a secondary source requiring primary verification",()=>{
  const source=SECURITY_RESEARCH_SOURCES.find(item=>item.id==="freebuf");
  assert.equal(source?.tier,"secondary");
  assert.equal(source?.requiresPrimaryVerification,true);
});

test("secondary security findings cannot be promoted without primary evidence",()=>{
  assert.throws(()=>validateSecurityFinding({
    sourceId:"freebuf",
    title:"Agent issue",
    url:"https://www.freebuf.com/example",
    claim:"example claim",
    primaryEvidenceUrls:[]
  }),/Primary-source verification/);

  validateSecurityFinding({
    sourceId:"freebuf",
    title:"Agent issue",
    url:"https://www.freebuf.com/example",
    claim:"example claim",
    primaryEvidenceUrls:["https://nvd.nist.gov/vuln/detail/CVE-2026-0000"]
  });
});
