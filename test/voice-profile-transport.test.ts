// Structural transport only: synthetic service, no catalog/inference authority.
import test from "node:test";import assert from "node:assert/strict";import {createHash} from "node:crypto";
import {DepartmentGateway,departmentCommand} from "../src/department-gateway.js";
const command=(profileId:string)=>({operation:"voice.speech" as const,requestId:"exact-profile-request",input:{sessionId:"owner-session",turnId:"owner-turn",text:"Do not send it. Zero point one remains exact.",profileId,exactText:true as const}});
const endpoint={baseUrl:"http://127.0.0.1:1234/",token:"synthetic-profile-service-token-123456789"};
test("explicit opaque profiles transport unchanged; receipt cannot silently switch to Heart",async()=>{
 let calls=0,substitute=false;const gateway=new DepartmentGateway({tenantId:"tenant",actorId:"owner",voice:endpoint,fetcher:async(_url,init)=>{calls++;const body=JSON.parse(String(init?.body));assert.equal(body.exactText,true);assert.equal(body.text,command(body.profileId).input.text);return Response.json({...body,profileId:substitute?"af_heart":body.profileId,status:"queued",textSha256:createHash("sha256").update(body.text).digest("hex"),inputSha256:createHash("sha256").update(JSON.stringify(body)).digest("hex")});}});
 for(const profile of ["af_heart","am_michael"]){const c=command(profile);assert.equal(departmentCommand.safeParse(c).success,true);const receipt=await gateway.execute(c);assert.equal(receipt.profileId,profile);assert.equal(receipt.status,"queued");}
 assert.equal(calls,2);substitute=true;await assert.rejects(gateway.execute(command("am_michael")),/Voice receipt input mismatch/);assert.equal(calls,3);
});
test("profile transport remains bounded opaque data without paths or model overrides",()=>{for(const profile of ["", "x".repeat(81),"../voice.pt","C:/voice.pt","af_heart\\extra","voice name"]){assert.equal(departmentCommand.safeParse(command(profile)).success,false);}assert.equal(departmentCommand.safeParse({...command("af_heart"),input:{...command("af_heart").input,engine:"other"}}).success,false);});
