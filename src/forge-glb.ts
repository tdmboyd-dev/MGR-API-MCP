/** Bounded receiver validation adapted from Forge's own forge/glb.py inspector.
 * This is the shared-edge transfer profile, not a replacement geometry engine,
 * general glTF renderer, rights check or independent Blender acceptance.
 */
export function inspectForgeGlb(bytes:Uint8Array,byteLimit=800_000){
 const fail=():never=>{throw Error('Forge artifact is not real GLB: unsupported or corrupt self-contained triangle model');};
 if(!(bytes instanceof Uint8Array)||bytes.byteLength<28||bytes.byteLength>byteLimit)fail();
 const blob=Buffer.from(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(blob.toString('ascii',0,4)!=='glTF'||blob.readUInt32LE(4)!==2||blob.readUInt32LE(8)!==blob.length)fail();
 const chunks:Array<{kind:number;data:Buffer}>=[];
 for(let cursor=12;cursor<blob.length;){
  if(cursor+8>blob.length||chunks.length>=2)fail();
  const length=blob.readUInt32LE(cursor),kind=blob.readUInt32LE(cursor+4);cursor+=8;
  if(length%4||length>blob.length-cursor)fail();
  chunks.push({kind,data:blob.subarray(cursor,cursor+length)});cursor+=length;
 }
 if(chunks.length!==2||chunks[0]!.kind!==0x4e4f534a||chunks[1]!.kind!==0x004e4942)fail();
 let doc:any;
 try{doc=JSON.parse(new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(chunks[0]!.data));}catch{fail();}
 const object=(x:any)=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 const uint=(x:any,max=byteLimit)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
 const index=(x:any,items:any[])=>uint(x,items.length-1);
 if(!object(doc)||!object(doc.asset)||doc.asset.version!=='2.0')fail();
 // Reject unqualified decoder/compression extensions and external references.
 if(doc.extensionsRequired!==undefined&&(!Array.isArray(doc.extensionsRequired)||doc.extensionsRequired.length))fail();
 const pending=[{value:doc,depth:0}];let nodes=0;
 while(pending.length){const {value,depth}=pending.pop()!;
  if(++nodes>100000||depth>64)fail();
  if(value&&typeof value==='object')for(const [key,child] of Object.entries(value)){
   if(key==='uri')fail();
   pending.push({value:child,depth:depth+1});
  }
 }
 const binary=chunks[1]!.data,buffers=doc.buffers,views=doc.bufferViews,accessors=doc.accessors,meshes=doc.meshes;
 if(!Array.isArray(buffers)||buffers.length!==1||!object(buffers[0])||!uint(buffers[0].byteLength,binary.length)||binary.length-buffers[0].byteLength>3||
    !Array.isArray(views)||views.length>4096||!Array.isArray(accessors)||accessors.length>8192||!Array.isArray(meshes)||meshes.length<1||meshes.length>4096)fail();
 for(const view of views){
  if(!object(view)||view.buffer!==0||!uint(view.byteOffset??0)||!uint(view.byteLength)||view.byteLength===0||(view.byteOffset??0)+view.byteLength>buffers[0].byteLength)fail();
  if(view.byteStride!==undefined&&(!uint(view.byteStride,252)||view.byteStride<4||view.byteStride%4))fail();
 }
 const widths:Record<number,number>={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};
 const dimensions:Record<string,number>={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16};
 const meta:Array<{start:number;stride:number;width:number;count:number;component:number;shape:string}>=[];
 let work=0;
 const spend=(amount:number)=>{work+=amount;if(work>2000000)fail();};
 for(const accessor of accessors){
  if(!object(accessor)||accessor.sparse!==undefined||!index(accessor.bufferView,views)||!uint(accessor.count)||accessor.count<1||!Object.hasOwn(widths,accessor.componentType)||!Object.hasOwn(dimensions,accessor.type))fail();
  if(accessor.type.startsWith('MAT')&&accessor.componentType!==5126)fail(); // No packed integer-matrix decoder in this profile.
  const view=views[accessor.bufferView],component=widths[accessor.componentType]!,width=component*dimensions[accessor.type]!,stride=view.byteStride??width,offset=accessor.byteOffset??0,start=(view.byteOffset??0)+offset;
  if(!uint(offset)||offset%component||start%component||stride<width||stride%component||offset+(accessor.count-1)*stride+width>view.byteLength)fail();
  if(accessor.componentType===5126){
   spend(accessor.count*dimensions[accessor.type]!);
   for(let i=0;i<accessor.count;i++)for(let c=0;c<dimensions[accessor.type]!;c++)if(!Number.isFinite(binary.readFloatLE(start+i*stride+c*4)))fail();
  }
  meta.push({start,stride,width,count:accessor.count,component:accessor.componentType,shape:accessor.type});
 }
 let triangles=0,vertices=0,primitives=0;
 for(const mesh of meshes){
  if(!object(mesh)||!Array.isArray(mesh.primitives)||mesh.primitives.length<1||mesh.primitives.length>4096)fail();
  for(const primitive of mesh.primitives){
   if(++primitives>8192||!object(primitive)||(primitive.mode??4)!==4||!object(primitive.attributes))fail();
   const attrs=primitive.attributes,pi=attrs.POSITION,ni=attrs.NORMAL,ii=primitive.indices;
   if(!index(pi,accessors)||!index(ni,accessors)||!index(ii,accessors))fail();
   const pos=meta[pi]!,norm=meta[ni]!,indices=meta[ii]!;
   if(pos.component!==5126||pos.shape!=='VEC3'||norm.component!==5126||norm.shape!=='VEC3'||pos.count!==norm.count||indices.shape!=='SCALAR'||![5121,5123,5125].includes(indices.component)||indices.count%3)fail();
   for(const ai of Object.values(attrs))if(!index(ai,accessors)||meta[ai as number]!.count!==pos.count)fail();
   if(primitive.targets!==undefined){
    if(!Array.isArray(primitive.targets)||primitive.targets.length>256)fail();
    for(const target of primitive.targets){if(!object(target)||!Object.keys(target).length)fail();for(const ai of Object.values(target))if(!index(ai,accessors)||meta[ai as number]!.count!==pos.count)fail();}
   }
   spend(indices.count);
   for(let i=0;i<indices.count;i++){
    const offset=indices.start+i*indices.stride;
    const vertex=indices.component===5121?binary.readUInt8(offset):indices.component===5123?binary.readUInt16LE(offset):binary.readUInt32LE(offset);
    if(vertex>=pos.count)fail();
   }
   triangles+=indices.count/3;vertices+=pos.count;
  }
 }
 // Embedded images must point at the same bounded BIN; no network/data URIs.
 if(doc.images!==undefined){if(!Array.isArray(doc.images)||doc.images.length>4096)fail();for(const image of doc.images)if(!object(image)||!index(image.bufferView,views)||!['image/png','image/jpeg'].includes(image.mimeType))fail();}
 return {profile:'mgr.forge.shared-glb-triangles.v1' as const,meshes:meshes.length,primitives,vertices,triangles};
}
