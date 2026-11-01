/** Shared schemas for native creation and read-only exact-request verification. */
import * as z from 'zod/v4';
const coordinates=z.tuple([z.number().finite(),z.number().finite(),z.number().finite()]);
const worldEdits=z.object({
  schema:z.literal("mgr.forge.world-edit.v1"),
  asset_sha256:z.string().regex(/^[a-f0-9]{64}$/),
  buildings:z.array(z.object({
    id:z.string().min(1).max(120),
    center:coordinates, size:coordinates,
    material:z.string().min(1).max(100)
  }).strict()).min(1).max(300)
}).strict();

export const forgeWorldInput=z.object({requestId:z.string().regex(/^[A-Za-z0-9_-]{12,100}$/),edits:worldEdits});

export const forgeCreatureInput=z.object({
        requestId:z.string().regex(/^[A-Za-z0-9_-]{12,100}$/),
        prompt:z.string().min(8).max(500),
        seed:z.number().int().min(0).max(4294967295).default(42),
        variants:z.number().int().min(1).max(12).default(4),
        morph:z.object({
          length:z.number().finite().min(0.5).max(2.2).optional(),
          height:z.number().finite().min(0.5).max(2.2).optional(),
          width:z.number().finite().min(0.5).max(2.2).optional(),
          twist_degrees:z.number().finite().min(-45).max(45).optional(),
          bend_degrees:z.number().finite().min(-30).max(30).optional(),
          taper:z.number().finite().min(0.65).max(1.45).optional()
        }).strict().optional()
      }).strict();

export const forgeBiomeInput=z.object({
        requestId:z.string().regex(/^[A-Za-z0-9_-]{12,100}$/),
        biome:z.enum(["forest","desert","tundra","volcanic","alien"]),
        seed:z.number().int().min(0).max(4294967295).default(42),
        resolution:z.number().int().min(10).max(64).default(28)
      }).strict();

export const forgeHumanInput=z.object({
        requestId:z.string().regex(/^[A-Za-z0-9_-]{12,100}$/),
        fps:z.number().int().min(12).max(60).default(24),
        timings:z.object({
          schema:z.literal("mgr.forge.phoneme-timeline.v1"),
          actor_id:z.string().min(1).max(80).regex(/^[A-Za-z0-9_-]+$/),
          language:z.literal("en-US"),
          duration_ms:z.number().int().min(100).max(120000),
          phonemes:z.array(z.object({
            phoneme:z.string().min(1).max(8),
            start_ms:z.number().int().min(0),
            end_ms:z.number().int().min(1)
          }).strict()).min(1).max(1000)
        }).strict()
      }).strict();

export const forgeCompositionInput=z.object({
        requestId:z.string().regex(/^[A-Za-z0-9_-]{12,100}$/),
        biomeRequestId:z.string().regex(/^[A-Za-z0-9_-]{12,100}$/)
      }).strict();

export const forgeVerifyInput=z.discriminatedUnion('kind',[
z.object({kind:z.literal('world'),input:forgeWorldInput}).strict()
,z.object({kind:z.literal('creature'),input:forgeCreatureInput}).strict()
,z.object({kind:z.literal('biome'),input:forgeBiomeInput}).strict()
,z.object({kind:z.literal('human'),input:forgeHumanInput}).strict()
,z.object({kind:z.literal('composed'),input:forgeCompositionInput}).strict()
]);
export type ForgeRequestVerification=z.infer<typeof forgeVerifyInput>;
