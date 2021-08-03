import { IIdentifier, VerifiableCredential, W3CCredential, W3CPresentation,
  VerifiablePresentation, IKey,} from '@veramo/core'
import { CredentialIssuer, IContext } from '../action-handler'
import { LdCredentialModule } from '../ld-credential-module'
import { LdContextLoader } from '../ld-context-loader'
import { LdDefaultContexts } from '../ld-default-contexts'
import {contexts as credential_contexts} from '@transmute/credentials-context'

const mockDidJwtVc = {
  createVerifiableCredentialJwt: jest.fn().mockReturnValue('mockVcJwt'),
  createVerifiablePresentationJwt: jest.fn().mockReturnValue('mockVcJwt'),
  verifyCredential: jest.fn().mockReturnValue({ payload: {} }),
  normalizeCredential: jest.fn().mockReturnValue('mockCredential'),
  normalizePresentation: jest.fn().mockReturnValue('mockPresentation'),
}

jest.mock('did-jwt-vc', () => mockDidJwtVc)

const mockIdentifiers: IIdentifier[] = [
  {
    did: 'did:example:111',
    provider: 'mock',
    controllerKeyId: 'kid1',
    keys: [
      {
        kid: 'kid1',
        publicKeyHex: 'pub',
        type: 'Secp256k1',
        kms: 'mock',
      },
    ],
    services: [],
  },
  {
    did: 'did:example:222',
    provider: 'mock',
    controllerKeyId: 'kid2',
    keys: [
      {
        kid: 'kid2',
        publicKeyHex: 'pub',
        type: 'Secp256k1',
        kms: 'mock',
      },
    ],
    services: [],
  },
  {
    did: 'did:example:333',
    provider: 'mock',
    controllerKeyId: 'kid3',
    keys: [
      {
        kid: 'kid3',
        publicKeyHex: 'pub',
        type: 'Ed25519',
        kms: 'mock',
      },
    ],
    services: [],
  },
]

const w3c = new CredentialIssuer({
  ldCredentialModule: new LdCredentialModule({
    ldContextLoader: new LdContextLoader({
      contextsPaths: [
        LdDefaultContexts,
        credential_contexts as Map<string, object>
      ]
    })
  })
})

let agent = {
  execute: jest.fn(),
  availableMethods: jest.fn(),
  resolveDid: jest.fn(),
  getDIDComponentById: jest.fn(),
  emit: jest.fn(),
  keyManagerSign: jest.fn().mockImplementation(async (args): Promise<string> => 'mockJWT'),
  keyManagerGet: jest.fn().mockImplementation(async (args): Promise<IKey> => ({
      kid: '',
      kms: '',
      type: 'Ed25519',
      publicKeyHex: '',
    })),
    dataStoreSaveVerifiableCredential: jest.fn().mockImplementation(async (args): Promise<boolean> => true),
    dataStoreSaveVerifiablePresentation: jest.fn().mockImplementation(async (args): Promise<boolean> => true),
    getSchema: jest.fn(),
  didManagerGet: jest.fn(),
}

describe('@veramo/credential-w3c', () => {
  test.each(mockIdentifiers)('handles createVerifiableCredential', async (mockIdentifier) => {
    expect.assertions(3 * mockIdentifiers.length)

    agent.didManagerGet = jest.fn().mockImplementation(async (args): Promise<IIdentifier> => mockIdentifier)
    const context: IContext = { agent: agent }

    for (let otherMockIdentifier of mockIdentifiers) {
      const credential: W3CCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1', 'https://www.w3.org/2020/demo/4342323'],
        type: ['VerifiableCredential', 'PublicProfile'],
        issuer: { id: mockIdentifier.did },
        issuanceDate: new Date().toISOString(),
        id: 'vc1',
        credentialSubject: {
          id: otherMockIdentifier.did,
          name: 'Alice',
          profilePicture: 'https://example.com/a.png',
          address: {
            street: 'Some str.',
            house: 1,
          },
        },
      }

      const vc = await w3c.createVerifiableCredential(
        {
          credential,
          save: true,
          proofFormat: 'jwt',
        },
        context,
      )
      // TODO Update these after refactoring did-jwt-vc
      expect(context.agent.didManagerGet).toBeCalledWith({ did: mockIdentifier.did })
      expect(context.agent.dataStoreSaveVerifiableCredential).toBeCalledWith({
        verifiableCredential: 'mockCredential',
      })
      expect(vc).toEqual('mockCredential')
    }
  })

  test.each(mockIdentifiers)('handles createVerifiablePresentation', async (mockIdentifier) => {
    expect.assertions(3 * mockIdentifiers.length)

    agent.didManagerGet = jest.fn().mockImplementation(async (args): Promise<IIdentifier> => mockIdentifier)
    const context: IContext = { agent: agent }

    mockIdentifiers.forEach(async (otherMockIdentifier) => {
      const credential: VerifiableCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', 'PublicProfile'],
        issuer: { id: mockIdentifier.did },
        issuanceDate: new Date().toISOString(),
        id: 'vc1',
        credentialSubject: {
          id: otherMockIdentifier.did,
          name: 'Alice',
          profilePicture: 'https://example.com/a.png',
          address: {
            street: 'Some str.',
            house: 1,
          },
        },
        proof: {
          jwt: 'mockJWT',
        },
      }

      const presentation: W3CPresentation = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiablePresentation'],
        holder: mockIdentifier.did,
        verifier: [otherMockIdentifier.did],
        issuanceDate: new Date().toISOString(),
        verifiableCredential: [credential],
      }

      const vp = await w3c.createVerifiablePresentation(
        {
          presentation,
          save: true,
          proofFormat: 'jwt',
        },
        context,
      )

      expect(context.agent.didManagerGet).toBeCalledWith({ did: mockIdentifier.did })
      expect(context.agent.dataStoreSaveVerifiablePresentation).toBeCalledWith({
        verifiablePresentation: 'mockPresentation',
      })
      expect(vp).toEqual('mockPresentation')
    })
  })
})
