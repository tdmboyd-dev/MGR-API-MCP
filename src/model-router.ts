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
}

export interface ModelRouteRequest {
  taskClass:ModelTaskClass;
  risk:ModelRisk;
  minQualityRank:number;
  maxCostRank?:number;
  requireTools?:boolean;
  preferLatency?:boolean;
  excludedProviders?:string[];
}

export interface ModelRouteDecision {
  candidate:ModelCandidate;
  reason:string;
  escalated:boolean;
}

const riskRank:Record<ModelRisk,number>={low:1,medium:2,high:3};

export class CostAwareModelRouter {
  constructor(private readonly candidates:ModelCandidate[]){}

  route(request:ModelRouteRequest):ModelRouteDecision|null{
    const excluded=new Set(request.excludedProviders ?? []);
    const eligible=this.candidates.filter(c=>
      c.enabled &&
      c.taskClasses.includes(request.taskClass) &&
      c.qualityRank>=request.minQualityRank &&
      riskRank[c.maxRisk]>=riskRank[request.risk] &&
      (!request.requireTools || c.supportsTools) &&
      !excluded.has(c.provider) &&
      (request.maxCostRank===undefined || c.costRank<=request.maxCostRank)
    );
    if(!eligible.length) return null;

    eligible.sort((a,b)=>{
      if(a.costRank!==b.costRank) return a.costRank-b.costRank;
      if(request.preferLatency && a.latencyRank!==b.latencyRank) return a.latencyRank-b.latencyRank;
      if(a.qualityRank!==b.qualityRank) return b.qualityRank-a.qualityRank;
      return a.id.localeCompare(b.id);
    });

    const chosen=eligible[0];
    const cheapest=this.candidates
      .filter(c=>c.enabled && c.taskClasses.includes(request.taskClass) && !excluded.has(c.provider))
      .sort((a,b)=>a.costRank-b.costRank)[0];

    const escalated=Boolean(cheapest && cheapest.id!==chosen.id);
    return {
      candidate:{...chosen,taskClasses:[...chosen.taskClasses]},
      escalated,
      reason:escalated
        ? `Escalated because policy requires quality >= ${request.minQualityRank}, risk ${request.risk}${request.requireTools?", and tool use":""}.`
        : "Selected the lowest-cost eligible model."
    };
  }
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
