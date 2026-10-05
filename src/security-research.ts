export type SecuritySourceTier = "primary"|"secondary"|"community";

export interface SecurityResearchSource {
  id:string;
  name:string;
  baseUrl:string;
  tier:SecuritySourceTier;
  topics:string[];
  requiresPrimaryVerification:boolean;
}

export const SECURITY_RESEARCH_SOURCES:SecurityResearchSource[]=[
  {
    id:"freebuf",
    name:"FreeBuf",
    baseUrl:"https://www.freebuf.com/",
    tier:"secondary",
    topics:["ai-security","mcp","agent-security","vulnerabilities","enterprise-security","defensive-tools"],
    requiresPrimaryVerification:true
  }
];

export interface SecurityFinding {
  sourceId:string;
  title:string;
  url:string;
  claim:string;
  primaryEvidenceUrls:string[];
}

export function validateSecurityFinding(finding:SecurityFinding):void{
  const source=SECURITY_RESEARCH_SOURCES.find(item=>item.id===finding.sourceId);
  if(!source) throw new Error(`Unknown security research source: ${finding.sourceId}`);
  if(source.requiresPrimaryVerification && finding.primaryEvidenceUrls.length===0){
    throw new Error(`Primary-source verification is required for findings from ${source.name}`);
  }
  for(const url of [finding.url,...finding.primaryEvidenceUrls]){
    const parsed=new URL(url);
    if(parsed.protocol!=="https:") throw new Error("Security research evidence URLs must use HTTPS");
  }
}
