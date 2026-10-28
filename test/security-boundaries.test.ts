import test from "node:test";
import assert from "node:assert/strict";
import {ActionSentinel} from "../src/action-sentinel.js";
import {assertAuthorized} from "../src/authz.js";
import {authorizeMcpRequest} from "../src/http-auth.js";
import {VoiceRightsRegistry} from "../src/voice-fabric.js";
import {applyPrivacyPolicy} from "../src/privacy-firewall.js";
const auth={actorId:"a",tenantId:"t",audience:"https://example.invalid/mcp",scopes:["execute"],expiresAt:Date.now()+60000};
test("malformed authorization and approval expiry cannot become unlimited grants",async()=>{
 for(const expiresAt of [NaN,Infinity,-Infinity]){
 assert.throws(()=>assertAuthorized({...auth,expiresAt},{audience:auth.audience,requiredScopes:[]}));
 const r=await authorizeMcpRequest({authorizationHeader:"Bearer fixture",resourceAudience:auth.audience,requiredScopes:[],resourceMetadataUrl:"https://example.invalid/metadata",verifier:{async verify(){return {subject:"a",tenantId:"t",audience:auth.audience,scopes:[],expiresAt};}}});assert.equal(r.ok,false);
 }
 const sentinel=new ActionSentinel(),action={taskId:"task",tool:{id:"x",version:"1",description:"x",sideEffect:"irreversible" as const,requiredScopes:["execute"],approvalPolicy:"always" as const},payload:{},audience:auth.audience,risk:"high" as const};
 const digest=sentinel.evaluate(auth,action).actionDigest;
 for(const expiresAt of ["", "not-a-date","2020-01-01"]){assert.equal(sentinel.evaluate(auth,action,{id:"approval",taskId:"task",actionDigest:digest,state:"approved",expiresAt}).state,"DENY");}
 const rights=new VoiceRightsRegistry();rights.register({subjectId:"person",consentId:"c",permittedUses:["synthesis"],source:"fixture",expiresAt:"invalid"});assert.throws(()=>rights.require("person","synthesis"),/expired/);
});
test("overlapping privacy detectors redact a combined range without exposing original digits",()=>{
 const raw="Reference 1234567890123456 phone 212-555-1234";
 const result=applyPrivacyPolicy(raw,{externalProviderAllowed:true,redact:["PII","FINANCIAL"],deny:["SECRET"]});
 assert.equal(result.decision,"REDACT");assert.equal(/\d{4}/.test(result.text),false);assert.ok(result.text.includes("[REDACTED_"));
});
