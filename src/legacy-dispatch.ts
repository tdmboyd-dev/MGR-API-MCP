import type {
  LegacyCommandRequest,
  LegacyCommandResult,
  LegacyEdgeContext
} from "./legacy-client.js";
import { LegacyEdgeClient } from "./legacy-client.js";

export type ReconciledDispatchResult =
  | {
      state:"confirmed";
      result:LegacyCommandResult;
      reconciled:boolean;
    }
  | {
      state:"unknown_external_state";
      correlationId:string;
      idempotencyKey:string;
      error:string;
    };

export class LegacyDispatchCoordinator {
  constructor(private readonly legacy:LegacyEdgeClient){}

  async execute(
    context:LegacyEdgeContext,
    request:LegacyCommandRequest
  ):Promise<ReconciledDispatchResult>{
    try{
      const result=await this.legacy.execute(context,request);
      return {state:"confirmed",result,reconciled:false};
    }catch(error){
      const receipts=await this.legacy.truthReceipts<any>(context.tenantId,{
        correlationId:context.correlationId,
        limit:10
      }).catch(()=>[]);

      const terminal=receipts.find(receipt=>
        receipt?.correlationId===context.correlationId &&
        ["succeeded","failed","blocked","rolled_back"].includes(String(receipt.status))
      );

      if(terminal){
        return {
          state:"confirmed",
          reconciled:true,
          result:{
            accepted:terminal.status==="succeeded",
            receiptId:String(terminal.receiptId),
            correlationId:context.correlationId,
            result:terminal.outcome
          }
        };
      }

      return {
        state:"unknown_external_state",
        correlationId:context.correlationId,
        idempotencyKey:context.idempotencyKey,
        error:error instanceof Error?error.message:String(error)
      };
    }
  }
}
