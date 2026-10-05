import { readFile } from "node:fs/promises";

const plugin=JSON.parse(await readFile("chatgpt-plugin/plugin.json","utf8"));
if(plugin.name!=="mgr-control-center") throw new Error("unexpected plugin name");
const short=plugin?.extensions?.["com.openai"]?.interface?.shortDescription;
if(typeof short!=="string" || short.length>30) throw new Error("shortDescription must be <= 30 characters");
const skill=await readFile("chatgpt-plugin/skills/mgr-control/SKILL.md","utf8");
if(!skill.includes("name: mgr-control")) throw new Error("skill frontmatter missing");
let mcp=null;
try{mcp=JSON.parse(await readFile("chatgpt-plugin/mcp.json","utf8"));}catch{}
if(mcp){
  const server=mcp?.mcpServers?.["mgr-api-mcp"];
  if(server?.type!=="streamable-http") throw new Error("unexpected MCP transport");
  const url=new URL(server.url);
  if(url.protocol!=="https:" || url.pathname!=="/mcp") throw new Error("MCP URL must be HTTPS /mcp");
}
console.log(JSON.stringify({ok:true,mcpConfigured:Boolean(mcp),shortDescriptionLength:short.length}));
