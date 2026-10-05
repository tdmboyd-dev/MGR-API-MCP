const apiKey=required("OPENAI_API_KEY");
const serverUrl=required("MCP_SERVER_URL");
const authorization=required("MCP_TEST_BEARER_TOKEN");
const model=process.env.OPENAI_MODEL ?? "gpt-6-astra";
const allowedTool=process.env.MCP_EXPECTED_TOOL ?? "mgr_truth_summary";

const body={
  model,
  tools:[{
    type:"mcp",
    server_label:"mgr_api_mcp",
    server_description:"MGR authenticated MCP edge backed by MGR Legacy and Creation OS",
    server_url:serverUrl,
    authorization,
    require_approval:"never",
    allowed_tools:[allowedTool]
  }],
  input:`Use the MGR MCP server. Call ${allowedTool} exactly once and summarize the returned result in one sentence.`
};

const response=await fetch("https://api.openai.com/v1/responses",{
  method:"POST",
  headers:{
    authorization:`Bearer ${apiKey}`,
    "content-type":"application/json"
  },
  body:JSON.stringify(body)
});
const text=await response.text();
let json;
try{json=JSON.parse(text);}catch{throw new Error(`OpenAI returned non-JSON HTTP ${response.status}: ${text.slice(0,1000)}`);}
if(!response.ok) throw new Error(`OpenAI Responses API failed: HTTP ${response.status}: ${JSON.stringify(json).slice(0,2000)}`);

const outputs=Array.isArray(json.output)?json.output:[];
const list=outputs.find(item=>item?.type==="mcp_list_tools");
if(!list) throw new Error("OpenAI response did not contain mcp_list_tools");
const tools=Array.isArray(list.tools)?list.tools:[];
if(!tools.some(tool=>tool?.name===allowedTool)){
  throw new Error(`OpenAI did not import expected tool ${allowedTool}`);
}
const call=outputs.find(item=>item?.type==="mcp_call" && item?.name===allowedTool);
if(!call) throw new Error(`OpenAI did not call expected MCP tool ${allowedTool}`);
if(call.error) throw new Error(`OpenAI MCP call returned error: ${JSON.stringify(call.error)}`);

console.log(JSON.stringify({
  ok:true,
  responseId:json.id,
  model:json.model ?? model,
  serverLabel:list.server_label,
  importedToolCount:tools.length,
  expectedTool:allowedTool,
  mcpCallId:call.id,
  outputPreview:String(call.output ?? "").slice(0,1000)
},null,2));

function required(name){
  const value=process.env[name];
  if(!value) throw new Error(`${name} is required`);
  return value;
}
