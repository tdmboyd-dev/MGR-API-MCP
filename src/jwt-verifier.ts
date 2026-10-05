import { createRemoteJWKSet, jwtVerify } from "jose";
import type { AccessTokenVerifier, VerifiedAccessToken } from "./http-auth.js";

export interface JwksAccessTokenVerifierOptions {
  jwksUrl:string;
  issuer:string;
  audience:string;
  tenantClaim?:string;
  scopeClaim?:string;
}

export class JwksAccessTokenVerifier implements AccessTokenVerifier {
  private readonly jwks:ReturnType<typeof createRemoteJWKSet>;
  private readonly tenantClaim:string;
  private readonly scopeClaim:string;

  constructor(private readonly options:JwksAccessTokenVerifierOptions){
    this.jwks=createRemoteJWKSet(new URL(options.jwksUrl));
    this.tenantClaim=options.tenantClaim ?? "tenant_id";
    this.scopeClaim=options.scopeClaim ?? "scope";
  }

  async verify(token:string):Promise<VerifiedAccessToken|null>{
    try{
      const {payload}=await jwtVerify(token,this.jwks,{
        issuer:this.options.issuer,
        audience:this.options.audience
      });
      if(!payload.sub || !payload.exp) return null;
      const tenant=payload[this.tenantClaim];
      if(typeof tenant!=="string" || !tenant.trim()) return null;

      const rawScopes=payload[this.scopeClaim];
      const scopes=Array.isArray(rawScopes)
        ? rawScopes.filter((scope):scope is string=>typeof scope==="string")
        : typeof rawScopes==="string"
          ? rawScopes.split(/\s+/).filter(Boolean)
          : [];

      return {
        subject:payload.sub,
        tenantId:tenant,
        audience:this.options.audience,
        scopes,
        expiresAt:payload.exp*1000
      };
    }catch{
      return null;
    }
  }
}
