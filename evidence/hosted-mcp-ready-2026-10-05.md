# Hosted MCP public proof

Status: READY FOR EXTERNAL CREDENTIAL/HOST PROOF

Repository-owned work complete:
- production Docker image and HTTP entrypoint
- public protected-resource metadata
- JWKS bearer-token validation
- tenant/scope binding
- Render deployment manifest
- Auth0 deployment contract
- remote-boundary verifier
- MCP client verifier
- OAuth provider verifier
- OpenAI remote MCP verifier
- containerized restart/timeout/duplicate-delivery boundary proof

Still external:
- provision the public host
- provide/configure Auth0 tenant/API
- provide deployed Legacy endpoint/service credential
- obtain a short-lived test access token
- provide OpenAI API credential for the final hosted Responses API MCP call

No secret values belong in this evidence file.
