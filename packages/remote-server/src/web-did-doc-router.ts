import { IIdentifier, IDIDManager, TAgent, TKeyType } from '@veramo/core'
import { Request, Router } from 'express'
import { ServiceEndpoint } from 'did-resolver'

interface RequestWithAgentDIDManager extends Request {
  agent?: TAgent<IDIDManager>
}

export const didDocEndpoint = '/.well-known/did.json'

const keyMapping: Record<TKeyType, string> = {
  Secp256k1: 'EcdsaSecp256k1VerificationKey2019',
  Ed25519: 'Ed25519VerificationKey2018',
  X25519: 'X25519KeyAgreementKey2019',
}

/**
 * @public
 */
 export interface WebDidDocRouterOptions {
  services?: ServiceEndpoint[]
}

/**
 * Creates a router that serves `did:web` DID Documents
 *
 * @param options - Initialization option
 * @returns Expressjs router
 */
export const WebDidDocRouter = (options: WebDidDocRouterOptions): Router => {
  const router = Router()

  const didDocForIdentifier = (identifier: IIdentifier) => {
    const allKeys = identifier.keys.map((key) => ({
      id: identifier.did + '#' + key.kid,
      type: keyMapping[key.type],
      controller: identifier.did,
      publicKeyHex: key.publicKeyHex,
    }))
    // ed25519 keys can also be converted to x25519 for key agreement
    const keyAgreementKeyIds = allKeys
      .filter((key) => ['Ed25519VerificationKey2018', 'X25519KeyAgreementKey2019'].includes(key.type))
      .map((key) => key.id)
    const signingKeyIds = allKeys
      .filter((key) => key.type !== 'X25519KeyAgreementKey2019')
      .map((key) => key.id)

    const didDoc = {
      '@context': 'https://w3id.org/did/v1',
      id: identifier.did,
      verificationMethod: allKeys,
      authentication: signingKeyIds,
      assertionMethod: signingKeyIds,
      keyAgreement: keyAgreementKeyIds,
      service: typeof options.services === 'undefined' ? identifier.services : [...options.services, ...identifier.services],
    }

    return didDoc
  }

  const getAliasForRequest = (req: Request) => {
    return encodeURIComponent(req.get('host') || req.hostname)
  }

  router.get(didDocEndpoint, async (req: RequestWithAgentDIDManager, res) => {
    if (req.agent) {
      try {
        const serverIdentifier = await req.agent.didManagerGet({
          did: 'did:web:' + getAliasForRequest(req),
        })
        const didDoc = didDocForIdentifier(serverIdentifier)
        res.json(didDoc)
      } catch (e) {
        res.status(404).send(e)
      }
    }
  })

  router.get(/^\/(.+)\/did.json$/, async (req: RequestWithAgentDIDManager, res) => {
    if (req.agent) {
      try {
        const identifier = await req.agent.didManagerGet({
          did: 'did:web:' + getAliasForRequest(req) + ':' + req.params[0].replace('/', ':'),
        })
        const didDoc = didDocForIdentifier(identifier)
        res.json(didDoc)
      } catch (e) {
        res.status(404).send(e)
      }
    }
  })

  return router
}
