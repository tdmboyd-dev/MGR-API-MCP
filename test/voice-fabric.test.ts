import test from "node:test";
import assert from "node:assert/strict";
import { VoiceFabric, VoiceRightsRegistry, VoiceboxMcpProvider, type VoiceProvider } from "../src/voice-fabric.js";

test("voice cloning requires an explicit rights grant",async()=>{
  const rights=new VoiceRightsRegistry();
  const provider:VoiceProvider={
    descriptor:{id:"cloud",provider:"test",mode:"cloud",capabilities:["tts"],languages:["en"],latencyRank:1,costRank:1,qualityRank:5,healthy:true},
    synthesize:async()=>({providerId:"cloud",operation:"tts",artifactRef:"a1",evidence:{}})
  };
  const fabric=new VoiceFabric([provider],rights);
  await assert.rejects(()=>fabric.synthesize({text:"hello",language:"en",cloneSubjectId:"person-1"}),/No voice-rights grant/);
  rights.register({subjectId:"person-1",consentId:"c1",permittedUses:["synthesis"],source:"owner-consent"});
  const result=await fabric.synthesize({text:"hello",language:"en",cloneSubjectId:"person-1"});
  assert.equal(result.evidence.voiceRightsChecked,true);
});

test("voice fabric prefers local provider when requested",async()=>{
  const rights=new VoiceRightsRegistry();
  const calls:string[]=[];
  const local:VoiceProvider={
    descriptor:{id:"local",provider:"local",mode:"local",capabilities:["tts"],languages:["*"],latencyRank:2,costRank:2,qualityRank:5,healthy:true},
    synthesize:async()=>{calls.push("local");return {providerId:"local",operation:"tts",evidence:{}};}
  };
  const cloud:VoiceProvider={
    descriptor:{id:"cloud",provider:"cloud",mode:"cloud",capabilities:["tts"],languages:["*"],latencyRank:1,costRank:1,qualityRank:6,healthy:true},
    synthesize:async()=>{calls.push("cloud");return {providerId:"cloud",operation:"tts",evidence:{}};}
  };
  const fabric=new VoiceFabric([cloud,local],rights);
  await fabric.synthesize({text:"hello",preferLocal:true});
  assert.deepEqual(calls,["local"]);
});

test("Voicebox adapter maps MGR requests to Voicebox MCP tools",async()=>{
  const calls:Array<{name:string;args:Record<string,unknown>}>= [];
  const provider=new VoiceboxMcpProvider(
    {id:"voicebox-local",provider:"voicebox",mode:"local",capabilities:["tts","stt","clone","profiles"],languages:["*"],latencyRank:2,costRank:1,qualityRank:6,healthy:true},
    {callTool:async(name,args)=>{calls.push({name,args});return name==="voicebox_speak"?{generation_id:"g1",status:"queued"}:{text:"hello",duration:1.2};}}
  );
  const rights=new VoiceRightsRegistry();
  const fabric=new VoiceFabric([provider],rights);
  const tts=await fabric.synthesize({text:"speak",profileId:"Morgan"});
  const stt=await fabric.transcribe({audioBase64:"YWJj"});
  assert.equal(tts.artifactRef,"g1");
  assert.equal(stt.text,"hello");
  assert.equal(calls[0]?.name,"voicebox_speak");
  assert.equal(calls[1]?.name,"voicebox_transcribe");
});
