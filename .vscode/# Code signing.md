# Code signing

I thought three different strategies:

- signature in the database
- signature in the bundle

All of them employ public-key signature.

## Signature in the database

This is the flow:

- Client request for an update
- Backend service returns the update
- Client validate the update info using the public key
- If the signature is valid, then the client will start the download of the bundle

### Open points

#### What happens if an attacker intercepts the bundle download by overriding the response?

The bundle would be installed without any issue. The client wouldn't know whether the bundle has been tampered.

## Signature in the bundle

This is the flow:

- Client request for an update
- Backend service returns the update
- Client gets the bundle using the location defined in the update info
- If the signature contained in the bundle is valid, then the client proceeds with the installation

### What happens if an attacker intercepts the bundle download by overriding the response?

The bundle would be installed only if the client does not have the public key. In the other cases, the client would be able to verify the signature contained in the bundle. Signature that only the issuer (i.e., the developer) could have generated with the private key.
