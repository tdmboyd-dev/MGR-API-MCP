import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const raw=process.env.MCP_SERVER_URL;
if(!raw) throw new Error("MCP_SERVER_URL is required");
const url=new URL(raw);
if(url.protocol!=="https:") throw new Error("MCP_SERVER_URL must use https");
if(url.pathname!=="/mcp") throw new Error("MCP_SERVER_URL must end exactly in /mcp");
if(url.username || url.password) throw new Error("MCP_SERVER_URL must not contain credentials");

const root=resolve("chatgpt-plugin");
await mkdir(root,{recursive:true});
const mcp={
  $schema:"https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
  mcpServers:{
    "mgr-api-mcp":{
      type:"streamable-http",
      url:url.toString()
    }
  }
};
await writeFile(resolve(root,"mcp.json"),JSON.stringify(mcp,null,2)+"\n","utf8");
console.log(JSON.stringify({ok:true,path:"chatgpt-plugin/mcp.json",url:url.toString()}));
