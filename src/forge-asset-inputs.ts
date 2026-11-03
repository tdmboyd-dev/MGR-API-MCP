/** Bounded native asset inputs; separate from ONE's five-operation department union. */
import * as z from 'zod/v4';
import {forgeCreatureInput,forgeVerifyInput} from './forge-inputs.js';

const requestId=z.string().regex(/^[A-Za-z0-9_-]{12,100}$/);
const binary=z.string().min(4).max(1_200_000).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/)
 .refine(value=>{const bytes=Buffer.from(value,'base64');return bytes.length>0&&bytes.length<=900_000&&bytes.toString('base64')===value;},'Canonical bounded base64 required');
export const forgeReconstructionInput=z.object({requestId,frontPngBase64:binary,sidePngBase64:binary,
 bounds:z.object({width:z.number().finite().min(.01).max(100),height:z.number().finite().min(.01).max(100),depth:z.number().finite().min(.01).max(100)}).strict(),
 grid:z.number().int().min(8).max(64),surface:z.enum(['voxel','smooth'])}).strict();
export const forgeMorphInput=z.object({requestId,glbBase64:binary,expectedSha256:z.string().regex(/^[a-f0-9]{64}$/),
 morph:forgeCreatureInput.shape.morph.unwrap()}).strict();
export const forgeUvInput=z.object({requestId,glbBase64:binary,expectedSha256:z.string().regex(/^[a-f0-9]{64}$/),
 atlasSize:z.union([z.literal(256),z.literal(512),z.literal(1024),z.literal(2048),z.literal(4096)]).default(2048),
 padding:z.number().int().min(1).max(16).default(2)}).strict();
export const forgeAssetVerifyInput=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('reconstruction'),input:forgeReconstructionInput}).strict(),
 z.object({kind:z.literal('morph'),input:forgeMorphInput}).strict(),
 z.object({kind:z.literal('uv'),input:forgeUvInput}).strict()]);
export const forgeNativeVerifyInput=z.union([forgeVerifyInput,forgeAssetVerifyInput]);
export type ForgeReconstructionInput=z.infer<typeof forgeReconstructionInput>;
export type ForgeMorphInput=z.infer<typeof forgeMorphInput>;
export type ForgeUvInput=z.infer<typeof forgeUvInput>;
export type ForgeAssetInput=ForgeReconstructionInput|ForgeMorphInput|ForgeUvInput;
export type ForgeNativeRequestVerification=z.infer<typeof forgeNativeVerifyInput>;

export function nativeAssetRequest(value:z.infer<typeof forgeAssetVerifyInput>):Record<string,unknown>{
 if(value.kind==='reconstruction')return {request_id:value.input.requestId,front_png_base64:value.input.frontPngBase64,
  side_png_base64:value.input.sidePngBase64,bounds:value.input.bounds,grid:value.input.grid,surface:value.input.surface};
 if(value.kind==='morph')return {request_id:value.input.requestId,glb_base64:value.input.glbBase64,expected_sha256:value.input.expectedSha256,morph:value.input.morph};
 return {request_id:value.input.requestId,glb_base64:value.input.glbBase64,expected_sha256:value.input.expectedSha256,
  atlas_size:value.input.atlasSize,padding:value.input.padding};
}
