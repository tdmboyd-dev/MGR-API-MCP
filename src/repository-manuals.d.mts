export interface ManualArguments {document?:string;startLine?:number;expectedCommit?:string|undefined}
export function createRepositoryManuals(roots:Record<string,string>):Readonly<{projects:readonly string[];project:(id:string)=>{id:string;root:string};read:(id:string,args?:ManualArguments)=>Record<string,unknown>}>;
