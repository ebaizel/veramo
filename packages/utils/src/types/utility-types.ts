import { IKey, KeyMetadata } from '@veramo/core'
import { VerificationMethod } from 'did-resolver'

/**
 * Broader definition of Verification method that includes the legacy publicKeyBase64
 * @internal
 */
export type _ExtendedVerificationMethod = VerificationMethod & { publicKeyBase64?: string }

/**
 * Represents an {@link @veramo/core#IKey} that has been augmented with its corresponding
 * entry from a DID document.
 * `key.meta.verificationMethod` will contain the {@link did-resolver#VerificationMethod}
 * object from the {@link did-resolver#DIDDocument}
 * @internal
 */
export interface _ExtendedIKey extends IKey {
  meta: KeyMetadata & {
    verificationMethod: _NormalizedVerificationMethod
  }
}

/**
 * Represents a {@link did-resolver#VerificationMethod} whose public key material
 * has been converted to `publicKeyHex`
 *
 * @internal
 */
export type _NormalizedVerificationMethod = Omit<
  VerificationMethod,
  'publicKeyBase58' | 'publicKeyBase64' | 'publicKeyJwk'
>
