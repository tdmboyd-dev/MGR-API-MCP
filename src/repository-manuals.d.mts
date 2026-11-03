export const MANUAL_RESPONSE_BYTES: number;
export interface ManualArguments {document?:string;startLine?:number;expectedCommit?:string|undefined;previous?:{commit:string;indexSha256:string}|undefined}
export function createRepositoryManuals(roots:Record<string,string>,options?:{allowUnavailable?:boolean}):Readonly<{projects:readonly string[];unavailable:readonly string[];project:(id:string)=>{id:string;root:string};read:(id:string,args?:ManualArguments)=>Record<string,unknown>}>;
