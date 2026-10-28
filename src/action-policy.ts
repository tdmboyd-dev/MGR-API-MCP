import type {ActionRisk} from './action-sentinel.js';
import type {ToolCapability} from './contracts.js';

// Host-owned admission floor. Caller labels can increase risk, never lower it.
// Domain services still enforce their own policy, grants, inputs and receipts.
const ranks:Record<ActionRisk,number>={low:0,medium:1,high:2,critical:3};
const atLeast=(requested:ActionRisk,floor:ActionRisk):ActionRisk=>
 Object.hasOwn(ranks,requested)&&ranks[requested]>=ranks[floor]?requested:floor;
export function legacyActionPolicy(action:string,requested:ActionRisk):{risk:ActionRisk;sideEffect:ToolCapability['sideEffect']}{
 const bounded=action==='crm.create_contact'||action==='crm.update_contact';
 return {risk:atLeast(requested,bounded?'medium':'high'),sideEffect:bounded?'reversible':'irreversible'};
}
export function creationActionPolicy(capability:string,maxCost:number|undefined,requested:ActionRisk):{risk:ActionRisk;sideEffect:ToolCapability['sideEffect']}{
 const bounded=capability==='document.markdown'&&maxCost===0;
 return {risk:atLeast(requested,bounded?'medium':'high'),sideEffect:bounded?'reversible':'irreversible'};
}
