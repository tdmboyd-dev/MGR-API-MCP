import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { JwksAccessTokenVerifier } from "../src/jwt-verifier.js";

test("JWKS verifier validates issuer, audience, tenant, scopes and expiry",async()=>{
  const {publicKey,privateKey}=await generateKeyPair("RS256");
  const jwk=await exportJWK(publicKey);
  Object.assign(jwk,{kid:"test-key",alg:"RS256",use:"sig"});

  const jwksServer=createServer((_req,res)=>{
    res.setHeader("content-type","application/json");
    res.end(JSON.stringify({keys:[jwk]}));
  });
  await new Promise<void>(resolve=>jwksServer.listen(0,"127.0.0.1",resolve));
  const address=jwksServer.address();
  assert.ok(address && typeof address==="object");
  const jwksUrl=`http://127.0.0.1:${address.port}/jwks.json`;

  try{
    const audience="https://api.mgr.example/mcp";
    const issuer="https://auth.mgr.example/";
    const token=await new SignJWT({
      tenant_id:"tenant-1",
      scope:"tools:read tools:execute"
    })
      .setProtectedHeader({alg:"RS256",kid:"test-key"})
      .setSubject("actor-1")
      .setIssuer(issuer)
      .setAudience(audience)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);

    const verifier=new JwksAccessTokenVerifier({jwksUrl,issuer,audience});
    const verified=await verifier.verify(token);
    assert.ok(verified);
    assert.equal(verified.subject,"actor-1");
    assert.equal(verified.tenantId,"tenant-1");
    assert.deepEqual(verified.scopes,["tools:read","tools:execute"]);

    const wrongAudience=new JwksAccessTokenVerifier({
      jwksUrl,
      issuer,
      audience:"https://wrong.example/mcp"
    });
    assert.equal(await wrongAudience.verify(token),null);
  }finally{
    await new Promise<void>((resolve,reject)=>jwksServer.close(error=>error?reject(error):resolve()));
  }
});
