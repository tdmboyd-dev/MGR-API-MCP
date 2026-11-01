/** Actual minimal indexed position/normal triangle GLB, no mocked magic header. */
export function forgeTriangleGlb(change?:(doc:any,binary:Buffer)=>void){
 const binary=Buffer.alloc(80);
 [[0,0,0],[1,0,0],[0,1,0]].flat().forEach((n,i)=>binary.writeFloatLE(n,i*4));
 [0,0,1,0,0,1,0,0,1].forEach((n,i)=>binary.writeFloatLE(n,36+i*4));
 [0,1,2].forEach((n,i)=>binary.writeUInt16LE(n,72+i*2));
 const doc:any={asset:{version:'2.0'},buffers:[{byteLength:78}],bufferViews:[{buffer:0,byteOffset:0,byteLength:36},{buffer:0,byteOffset:36,byteLength:36},{buffer:0,byteOffset:72,byteLength:6}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3'},{bufferView:1,componentType:5126,count:3,type:'VEC3'},{bufferView:2,componentType:5123,count:3,type:'SCALAR'}],meshes:[{primitives:[{attributes:{POSITION:0,NORMAL:1},indices:2}]}],nodes:[{mesh:0}],scenes:[{nodes:[0]}],scene:0};
 change?.(doc,binary);
 const json=Buffer.from(JSON.stringify(doc)),padded=Buffer.alloc(Math.ceil(json.length/4)*4,32);json.copy(padded);
 const header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(28+padded.length+binary.length,8);jh.writeUInt32LE(padded.length);jh.write('JSON',4);bh.writeUInt32LE(binary.length);bh.write('BIN\0',4);
 return Buffer.concat([header,jh,padded,bh,binary]);
}
