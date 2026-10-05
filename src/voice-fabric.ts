export type VoiceCapability = "stt"|"tts"|"clone"|"streaming"|"profiles";
export type VoiceExecutionMode = "local"|"cloud";

export interface VoiceRights {
  subjectId:string;
  consentId:string;
  permittedUses:string[];
  expiresAt?:string;
  source:string;
}

export interface VoiceProviderDescriptor {
  id:string;
  provider:string;
  mode:VoiceExecutionMode;
  capabilities:VoiceCapability[];
  languages:string[];
  latencyRank:number;
  costRank:number;
  qualityRank:number;
  healthy:boolean;
}

export interface VoiceSynthesisRequest {
  text:string;
  language?:string;
  profileId?:string;
  cloneSubjectId?:string;
  requireStreaming?:boolean;
  preferLocal?:boolean;
}

export interface VoiceTranscriptionRequest {
  audioBase64:string;
  language?:string;
  preferLocal?:boolean;
}

export interface VoiceArtifact {
  providerId:string;
  operation:"tts"|"stt";
  artifactRef?:string;
  text?:string;
  durationSeconds?:number;
  evidence:Record<string,unknown>;
}

export interface VoiceProvider {
  descriptor:VoiceProviderDescriptor;
  synthesize?(request:VoiceSynthesisRequest):Promise<VoiceArtifact>;
  transcribe?(request:VoiceTranscriptionRequest):Promise<VoiceArtifact>;
}

export class VoiceRightsRegistry {
  private readonly grants=new Map<string,VoiceRights>();

  register(grant:VoiceRights){
    this.grants.set(grant.subjectId,{...grant,permittedUses:[...grant.permittedUses]});
  }

  require(subjectId:string,use:string):VoiceRights{
    const grant=this.grants.get(subjectId);
    if(!grant) throw new Error(`No voice-rights grant for ${subjectId}`);
    if(grant.expiresAt && Date.parse(grant.expiresAt)<=Date.now()) throw new Error("Voice-rights grant expired");
    if(!grant.permittedUses.includes(use)) throw new Error(`Voice-rights grant does not allow ${use}`);
    return {...grant,permittedUses:[...grant.permittedUses]};
  }
}

export class VoiceFabric {
  constructor(
    private readonly providers:VoiceProvider[],
    private readonly rights:VoiceRightsRegistry
  ){}

  async synthesize(request:VoiceSynthesisRequest):Promise<VoiceArtifact>{
    if(request.cloneSubjectId) this.rights.require(request.cloneSubjectId,"synthesis");
    const provider=this.select("tts",request.language,request.preferLocal,request.requireStreaming);
    if(!provider?.synthesize) throw new Error("No eligible TTS provider");
    const artifact=await provider.synthesize(request);
    return {
      ...artifact,
      evidence:{
        ...artifact.evidence,
        voiceRightsChecked:Boolean(request.cloneSubjectId),
        route:{providerId:provider.descriptor.id,mode:provider.descriptor.mode}
      }
    };
  }

  async transcribe(request:VoiceTranscriptionRequest):Promise<VoiceArtifact>{
    const provider=this.select("stt",request.language,request.preferLocal,false);
    if(!provider?.transcribe) throw new Error("No eligible STT provider");
    const artifact=await provider.transcribe(request);
    return {
      ...artifact,
      evidence:{
        ...artifact.evidence,
        route:{providerId:provider.descriptor.id,mode:provider.descriptor.mode}
      }
    };
  }

  private select(capability:VoiceCapability,language?:string,preferLocal?:boolean,requireStreaming?:boolean):VoiceProvider|undefined{
    return this.providers
      .filter(provider=>
        provider.descriptor.healthy &&
        provider.descriptor.capabilities.includes(capability) &&
        (!language || provider.descriptor.languages.includes(language) || provider.descriptor.languages.includes("*")) &&
        (!requireStreaming || provider.descriptor.capabilities.includes("streaming"))
      )
      .sort((a,b)=>{
        if(preferLocal && a.descriptor.mode!==b.descriptor.mode) return a.descriptor.mode==="local"?-1:1;
        if(a.descriptor.costRank!==b.descriptor.costRank) return a.descriptor.costRank-b.descriptor.costRank;
        if(a.descriptor.qualityRank!==b.descriptor.qualityRank) return b.descriptor.qualityRank-a.descriptor.qualityRank;
        return a.descriptor.latencyRank-b.descriptor.latencyRank;
      })[0];
  }
}

export interface VoiceboxToolInvoker {
  callTool(name:string,args:Record<string,unknown>):Promise<Record<string,unknown>>;
}

export class VoiceboxMcpProvider implements VoiceProvider {
  constructor(
    readonly descriptor:VoiceProviderDescriptor,
    private readonly invoker:VoiceboxToolInvoker
  ){}

  async synthesize(request:VoiceSynthesisRequest):Promise<VoiceArtifact>{
    const result=await this.invoker.callTool("voicebox_speak",{
      text:request.text,
      ...(request.profileId?{profile:request.profileId}:{}),
      ...(request.language?{language:request.language}:{})
    });
    return {
      providerId:this.descriptor.id,
      operation:"tts",
      artifactRef:typeof result.generation_id==="string"?result.generation_id:undefined,
      evidence:{tool:"voicebox_speak",result}
    };
  }

  async transcribe(request:VoiceTranscriptionRequest):Promise<VoiceArtifact>{
    const result=await this.invoker.callTool("voicebox_transcribe",{
      audio_base64:request.audioBase64,
      ...(request.language?{language:request.language}:{})
    });
    return {
      providerId:this.descriptor.id,
      operation:"stt",
      text:typeof result.text==="string"?result.text:undefined,
      durationSeconds:typeof result.duration==="number"?result.duration:undefined,
      evidence:{tool:"voicebox_transcribe",result}
    };
  }
}
