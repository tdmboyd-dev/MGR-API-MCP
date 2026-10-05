import test from "node:test";
import assert from "node:assert/strict";
import { CostAwareModelRouter, estimateRequestCost, routeWithEscalation, type ModelCandidate } from "../src/model-router.js";

const candidates:ModelCandidate[]=[
  {id:"cheap",provider:"p1",model:"small",taskClasses:["classification","summarization"],qualityRank:2,costRank:1,latencyRank:1,maxRisk:"low",supportsTools:false,enabled:true},
  {id:"mid",provider:"p1",model:"mid",taskClasses:["classification","summarization","tool_use"],qualityRank:5,costRank:3,latencyRank:2,maxRisk:"medium",supportsTools:true,enabled:true},
  {id:"frontier",provider:"p2",model:"large",taskClasses:["classification","summarization","reasoning","tool_use"],qualityRank:9,costRank:8,latencyRank:4,maxRisk:"high",supportsTools:true,enabled:true}
];

test("router chooses cheapest model that satisfies policy",()=>{
  const router=new CostAwareModelRouter(candidates);
  const result=router.route({taskClass:"summarization",risk:"low",minQualityRank:1});
  assert.equal(result?.candidate.id,"cheap");
  assert.equal(result?.escalated,false);
});

test("router escalates for quality and risk instead of always using cheapest",()=>{
  const router=new CostAwareModelRouter(candidates);
  const result=router.route({taskClass:"summarization",risk:"medium",minQualityRank:5});
  assert.equal(result?.candidate.id,"mid");
  assert.equal(result?.escalated,true);
});

test("router can require tool-capable models",()=>{
  const router=new CostAwareModelRouter(candidates);
  const result=router.route({taskClass:"tool_use",risk:"medium",minQualityRank:4,requireTools:true});
  assert.equal(result?.candidate.id,"mid");
});

test("router respects provider exclusions and cost ceilings",()=>{
  const router=new CostAwareModelRouter(candidates);
  assert.equal(router.route({taskClass:"reasoning",risk:"high",minQualityRank:8,maxCostRank:5}),null);
  const result=router.route({taskClass:"summarization",risk:"medium",minQualityRank:5,excludedProviders:["p1"]});
  assert.equal(result?.candidate.id,"frontier");
});

test("escalation ladder can search increasing quality policies",()=>{
  const router=new CostAwareModelRouter(candidates);
  const result=routeWithEscalation(router,{
    taskClass:"reasoning",
    risk:"high",
    qualitySteps:[3,6,9]
  });
  assert.equal(result?.candidate.id,"frontier");
});


test("router excludes unhealthy and circuit-open candidates",()=>{
  const router=new CostAwareModelRouter(candidates);
  router.updateSignal({candidateId:"cheap",healthy:false});
  const result=router.route({taskClass:"summarization",risk:"low",minQualityRank:1});
  assert.equal(result?.candidate.id,"mid");
  assert.ok(result?.receipt.rejected.some(item=>item.id==="cheap" && item.reason==="unhealthy"));
});

test("semantic quality and provider health can justify a stronger route",()=>{
  const router=new CostAwareModelRouter(candidates);
  router.updateSignal({candidateId:"cheap",successRate:0.4,semanticQuality:0.2,quotaHeadroom:0.2,latencyMs:400});
  router.updateSignal({candidateId:"mid",successRate:0.99,semanticQuality:0.95,quotaHeadroom:0.9,latencyMs:200});
  const result=router.route({taskClass:"summarization",risk:"low",minQualityRank:1});
  assert.equal(result?.candidate.id,"mid");
  assert.equal(result?.escalated,true);
  assert.equal(result?.receipt.policy,"mgr_cost_aware_v2");
});

test("cache-aware cost estimator accounts for discounted cached input",()=>{
  const candidate:ModelCandidate={
    id:"priced",provider:"p",model:"m",taskClasses:["summarization"],qualityRank:5,costRank:2,latencyRank:2,
    maxRisk:"medium",supportsTools:false,enabled:true,inputCostPerMillion:2,outputCostPerMillion:8,cachedInputCostPerMillion:0.5
  };
  const uncached=estimateRequestCost(candidate,{taskClass:"summarization",risk:"low",minQualityRank:1,estimatedInputTokens:1_000_000,estimatedOutputTokens:100_000,expectedCacheHitRate:0});
  const cached=estimateRequestCost(candidate,{taskClass:"summarization",risk:"low",minQualityRank:1,estimatedInputTokens:1_000_000,estimatedOutputTokens:100_000,expectedCacheHitRate:1});
  assert.equal(uncached,2.8);
  assert.equal(cached,1.3);
});
