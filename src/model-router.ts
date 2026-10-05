export type ModelTaskClass = "classification"|"extraction"|"summarization"|"research"|"coding"|"planning"|"reasoning"|"multimodal"|"tool_use";
export type ModelRisk = "low"|"medium"|"high";

export interface ModelCandidate {
  id:string;
  provider:string;
  model:string;
  taskClasses:ModelTaskClass[];
  qualityRank:number;
  costRank:number;
  latencyRank:number;
  maxRisk:ModelRisk;
  supportsTools:boolean;
  enabled:boolean;
  contextWindow?:number;
  inputCostPerMillion?:number;
  outputCostPerMillion?:number;
  cachedInputCostPerMillion?:number;
}

export interface ProviderRouteSignal {
  candidateId:string;
  successRate?:number;
  semanticQuality?:number;
  latencyMs?:number;
  quotaHeadroom?:number;
  healthy?:boolean;
  circuitOpen?:boolean;
  observedAt?:string;
}

export interface ModelRouteRequest {
  taskClass:ModelTaskClass;
  risk:ModelRisk;
  minQualityRank:number;
  maxCostRank?:number;
  requireTools?:boolean;
  preferLatency?:boolean;
  excludedProviders?:string[];
  estimatedInputTokens?:number;
  estimatedOutputTokens?:number;
  expectedCacheHitRate?:number;
  minimumContextWindow?:number;
  historyTurns?:number;
}

export interface ModelRouteDecision {
  candidate:ModelCandidate;
  reason:string;
  escalated:boolean;
  score:number;
  estimatedCost?:number;
  signals?:ProviderRouteSignal;
  receipt:{
    policy:"mgr_cost_aware_v2";
    taskClass:ModelTaskClass;
    risk:ModelRisk;
    considered:string[];
    rejected:Array<{id:string;reason:string}>;
  };
}

const riskRank:Record<ModelRisk,number>={low:1,medium:2,high:3};

export class CostAwareModelRouter {
  private readonly signals=new Map<string,ProviderRouteSignal>();

  constructor(private readonly candidates:ModelCandidate[]){}

  updateSignal(signal:ProviderRouteSignal){
    this.signals.set(signal.candidateId,{...signal});
  }

  route(request:ModelRouteRequest):ModelRouteDecision|null{
    const excluded=new Set(request.excludedProviders ?? []);
    const rejected:Array<{id:string;reason:string}>=[];
    const eligible:ModelCandidate[]=[];

    for(const c of this.candidates){
      const signal=this.signals.get(c.id);
      let reason:string|undefined;
      if(!c.enabled) reason="disabled";
      else if(!c.taskClasses.includes(request.taskClass)) reason="task_class";
      else if(c.qualityRank<request.minQualityRank) reason="quality";
      else if(riskRank[c.maxRisk]<riskRank[request.risk]) reason="risk";
      else if(request.requireTools && !c.supportsTools) reason="tools";
      else if(excluded.has(c.provider)) reason="provider_excluded";
      else if(request.maxCostRank!==undefined && c.costRank>request.maxCostRank) reason="cost_ceiling";
      else if(request.minimumContextWindow!==undefined && (c.contextWindow ?? 0)<request.minimumContextWindow) reason="context_window";
      else if(signal?.healthy===false) reason="unhealthy";
      else if(signal?.circuitOpen) reason="circuit_open";

      if(reason) rejected.push({id:c.id,reason});
      else eligible.push(c);
    }
    if(!eligible.length) return null;

    const scored=eligible.map(candidate=>{
      const signal=this.signals.get(candidate.id);
      const estimatedCost=estimateRequestCost(candidate,request);
      let score=0;
      score+=candidate.qualityRank*4;
      score-=candidate.costRank*6;
      score-=candidate.latencyRank*(request.preferLatency?3:1);
      if(signal?.successRate!==undefined) score+=clamp01(signal.successRate)*12;
      if(signal?.semanticQuality!==undefined) score+=clamp01(signal.semanticQuality)*14;
      if(signal?.quotaHeadroom!==undefined) score+=clamp01(signal.quotaHeadroom)*5;
      if(signal?.latencyMs!==undefined) score-=Math.min(signal.latencyMs/1000,10);
      if(request.historyTurns && request.historyTurns>4) score+=candidate.contextWindow?Math.log10(candidate.contextWindow):0;
      if(estimatedCost!==undefined) score-=Math.min(estimatedCost*10,20);
      return {candidate,signal,estimatedCost,score};
    }).sort((a,b)=>b.score-a.score || a.candidate.id.localeCompare(b.candidate.id));

    const selected=scored[0];
    if(!selected) return null;

    const cheapest=this.candidates
      .filter(c=>c.enabled && c.taskClasses.includes(request.taskClass) && !excluded.has(c.provider))
      .sort((a,b)=>a.costRank-b.costRank || a.id.localeCompare(b.id))[0];
    const escalated=Boolean(cheapest && cheapest.id!==selected.candidate.id);

    return {
      candidate:{...selected.candidate,taskClasses:[...selected.candidate.taskClasses]},
      escalated,
      score:selected.score,
      ...(selected.estimatedCost!==undefined?{estimatedCost:selected.estimatedCost}:{}),
      ...(selected.signal?{signals:{...selected.signal}}:{}),
      reason:escalated
        ? "Selected a stronger route because quality, health, quota, latency, context, or policy outweighed the cheapest eligible model."
        : "Selected the lowest-cost eligible route after health and quality policy checks.",
      receipt:{
        policy:"mgr_cost_aware_v2",
        taskClass:request.taskClass,
        risk:request.risk,
        considered:eligible.map(c=>c.id),
        rejected
      }
    };
  }
}

export function estimateRequestCost(candidate:ModelCandidate,request:ModelRouteRequest):number|undefined{
  if(candidate.inputCostPerMillion===undefined || candidate.outputCostPerMillion===undefined) return undefined;
  const input=request.estimatedInputTokens ?? 0;
  const output=request.estimatedOutputTokens ?? 0;
  const hit=clamp01(request.expectedCacheHitRate ?? 0);
  const cachedRate=candidate.cachedInputCostPerMillion ?? candidate.inputCostPerMillion;
  const inputCost=((input*(1-hit))*candidate.inputCostPerMillion + input*hit*cachedRate)/1_000_000;
  const outputCost=(output*candidate.outputCostPerMillion)/1_000_000;
  return inputCost+outputCost;
}

export function routeWithEscalation(
  router:CostAwareModelRouter,
  base:Omit<ModelRouteRequest,"minQualityRank"> & {qualitySteps:number[]}
):ModelRouteDecision|null{
  for(const minQualityRank of base.qualitySteps){
    const result=router.route({...base,minQualityRank});
    if(result) return result;
  }
  return null;
}

function clamp01(value:number){return Math.max(0,Math.min(1,value));}
