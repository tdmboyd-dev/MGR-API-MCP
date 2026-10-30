/** Local HTTP owner cleanup only; no assertion about stopped domain effects. */
export interface OwnedHttpListener {
  close(callback:(error?:Error)=>void):unknown;
  closeAllConnections():void;
}
export interface OwnedDeadline {ref():unknown}
export interface HttpShutdownOutcome {
  exitCode:0|1;
  listenerClosed:boolean;
  handlerClosed:boolean;
  timedOut:boolean;
}
export interface HttpShutdownOptions {
  server:OwnedHttpListener;
  handler:{close():Promise<void>};
  report?:(record:Readonly<Record<string,string|boolean|number>>)=>void;
  // Trusted host/test composition only. No request/JSON can select callbacks.
  exit?:(code:0|1)=>void;
  setExitCode?:(code:0|1)=>void;
  setDeadline?:(callback:()=>void,milliseconds:number)=>OwnedDeadline;
  clearDeadline?:(timer:OwnedDeadline)=>void;
}
export function createHttpShutdownController(options:HttpShutdownOptions){
  const exit=options.exit??(code=>{process.exit(code);});
  const setExitCode=options.setExitCode??(code=>{process.exitCode=code;});
  const schedule=options.setDeadline??((callback,milliseconds)=>setTimeout(callback,milliseconds));
  const clear=options.clearDeadline??(timer=>clearTimeout(timer as ReturnType<typeof setTimeout>));
  const causes:unknown[]=[];
  let operation:Promise<Readonly<HttpShutdownOutcome>>|undefined,closing=false,finished=false;
  let listenerSettled=false,listenerClosed=false,handlerSettled=false,handlerClosed=false;
  let deadline:OwnedDeadline|undefined,deadlineReady=false,resolveOperation!:(result:Readonly<HttpShutdownOutcome>)=>void;
  function report(event:string){try{options.report?.(Object.freeze({event}));}catch(error){causes.push(error);}}
  function finish(timedOut:boolean){
    if(finished)return;finished=true;
    if(deadline)try{clear(deadline);}catch(error){causes.push(error);}
    if(timedOut||!listenerClosed){
      try{options.server.closeAllConnections();}catch(error){causes.push(error);report('mgr_api_mcp_shutdown_force_close_failed');}
    }
    let code:0|1=!timedOut&&listenerClosed&&handlerClosed&&causes.length===0?0:1;
    report(code===0?'mgr_api_mcp_shutdown_complete':'mgr_api_mcp_shutdown_unconfirmed');
    if(causes.length)code=1;
    try{setExitCode(code);}catch(error){causes.push(error);code=1;}
    const result=Object.freeze({exitCode:code,listenerClosed,handlerClosed,timedOut});
    resolveOperation(result);
    // Host exit is a request, not evidence that any remote operation stopped.
    try{exit(code);}catch(error){causes.push(error);}
  }
  function settleListener(success:boolean,error?:unknown){
    if(listenerSettled)return;listenerSettled=true;
    if(!success)causes.push(error);
    if(finished)return;
    if(!success)report('mgr_api_mcp_shutdown_listener_failed');else listenerClosed=true;
    if(handlerSettled)finish(false);
  }
  function settleHandler(success:boolean,error?:unknown){
    if(handlerSettled)return;handlerSettled=true;
    if(!success)causes.push(error);
    if(finished)return;
    if(!success)report('mgr_api_mcp_shutdown_handler_failed');else handlerClosed=true;
    if(listenerSettled)finish(false);
  }
  return Object.freeze({
    isClosing:()=>closing,
    /** Host-only diagnostics; never included in the HTTP response or log. */
    failureCauses:()=>Object.freeze([...causes]),
    begin(signal:'SIGTERM'|'SIGINT'):Promise<Readonly<HttpShutdownOutcome>>{
      if(operation)return operation;
      if(signal!=='SIGTERM'&&signal!=='SIGINT')throw Error('unsupported shutdown signal');
      operation=new Promise(resolve=>{resolveOperation=resolve;});closing=true;
      try{setExitCode(1);}catch(error){causes.push(error);}
      report('mgr_api_mcp_shutdown');
      try{
        deadline=schedule(()=>{if(finished)return;causes.push(Error('HTTP shutdown deadline exceeded'));report('mgr_api_mcp_shutdown_deadline');finish(true);},10000);
        deadline.ref(); // Keep the uncertainty deadline alive until confirmed.
        deadlineReady=true;
      }catch(error){causes.push(error);}
      // Neither owner may prevent the other close attempt. Both start now,
      // without awaiting promises or scheduling the handler close for later.
      try{options.server.close(error=>settleListener(error==null,error));}catch(error){settleListener(false,error);}
      try{const pending=options.handler.close();Promise.resolve(pending).then(()=>settleHandler(true),error=>settleHandler(false,error));}catch(error){settleHandler(false,error);}
      if(!deadlineReady)finish(true);
      return operation;
    }
  });
}
