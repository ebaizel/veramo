import { AbstractSecretBox, AbstractPrivateKeyStore } from '@veramo/key-manager'
import { Connection } from 'typeorm'
import { ImportablePrivateKey, ManagedPrivateKey } from '@veramo/key-manager/src/abstract-private-key-store'
import { PrivateKey } from '../entities/private-key'
import { v4 as uuid4} from 'uuid'
import Debug from 'debug'
const debug = Debug('veramo:typeorm:key-store')

export class PrivateKeyStore extends AbstractPrivateKeyStore {
  constructor(private dbConnection: Promise<Connection>, private secretBox?: AbstractSecretBox) {
    super()
    if (!secretBox) {
      console.warn('Please provide SecretBox to the KeyStore')
    }
  }

  async get({ alias }: { alias: string }): Promise<ManagedPrivateKey> {
    const key = await (await this.dbConnection).getRepository(PrivateKey).findOne(alias)
    if (!key) throw Error('Key not found')
    if (this.secretBox && key.privateKeyHex) {
      key.privateKeyHex = await this.secretBox.decrypt(key.privateKeyHex)
    }
    return key as ManagedPrivateKey
  }

  async delete({ alias }: { alias: string }) {
    const key = await (await this.dbConnection).getRepository(PrivateKey).findOne(alias)
    if (!key) throw Error(`not_found: Private Key data not found for alias=${alias}`)
    debug('Deleting private key data', alias)
    await (await this.dbConnection).getRepository(PrivateKey).remove(key)
    return true
  }

  async import(args: ImportablePrivateKey): Promise<ManagedPrivateKey> {
    const key = new PrivateKey()
    key.alias = args.alias || uuid4()
    key.privateKeyHex = args.privateKeyHex
    if (this.secretBox && key.privateKeyHex) {
      key.privateKeyHex = await this.secretBox.encrypt(key.privateKeyHex)
    }
    key.type = args.type
    debug('Saving private key data', args.alias)
    const keyRepo = await (await this.dbConnection).getRepository(PrivateKey)
    const existingKey = await keyRepo.findOne(key.alias)
    if (existingKey && existingKey.privateKeyHex !== key.privateKeyHex) {
      throw new Error(`key_already_exists: A key with this alias exists but with different data. Please use a different alias.`)
    }
    await keyRepo.save(key)
    return key
  }

  async list(): Promise<Array<ManagedPrivateKey>> {
    const keys = await (await this.dbConnection).getRepository(PrivateKey).find()
    return keys
  }
}
