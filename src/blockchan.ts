import * as crypto from 'crypto'

export class Transacao {
  constructor(public remetente: string, public destinatario: string, public valor: number) {}

  toString() {
    return JSON.stringify(this)
  }
}

export class Bloco {
  public nonce = Math.round(Math.random() * 999999999)

  constructor(
    public prevHash: string,
    public transacoes: Transacao,
    public blocoHash: string,
    public timestamp = Date.now()
  ) {}

  get hash() {
    const str = JSON.stringify(this)
    const hash = crypto.createHash('SHA256')
    hash.update(str).end()
    return hash.digest('hex')
  }
}

export class Chain {
  public static instance = new Chain()

  chain: Bloco[]

  constructor() {
    this.chain = [new Bloco('', new Transacao('genesis', 'satoshi', 100), '')]
  }

  get lastBlock() {
    return this.chain[this.chain.length - 1]
  }

  mine(nonce: number) {
    let solucao = 1
    console.log('Minerando...')

    while (true) {
      const hash = crypto.createHash('MD5')
      hash.update((nonce + solucao).toString()).end()

      const tentativa = hash.digest('hex')

      if (tentativa.substr(0, 4) === '0000') {
        console.log(`Solução encontrada: ${solucao}`)
        return solucao
      }

      solucao += 1
    }
  }

  addBlock(transacoes: Transacao, remetente: string, signature: Buffer) {
    const verificador = crypto.createVerify('SHA256')
    verificador.update(transacoes.toString())

    const isValid = verificador.verify(remetente, signature)

    if (isValid) {
      console.log('Transação válida', this.lastBlock.hash)

      const novoBloco = new Bloco(this.lastBlock.hash, transacoes, '')
      this.mine(novoBloco.nonce)
      this.chain.push(novoBloco)
    }
  }
}

export class Wallet {
  public publicKey: string
  public privateKey: string

  constructor() {
    const keypair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    })

    this.publicKey = keypair.publicKey
    this.privateKey = keypair.privateKey
  }

  sendMoney(valor: number, destinatario: string) {
    const transacao = new Transacao(this.publicKey, destinatario, valor)

    const assinatura = crypto.sign('sha256', Buffer.from(transacao.toString()), this.privateKey)

    Chain.instance.addBlock(transacao, this.publicKey, assinatura)
  }
}

const satoshi = new Wallet()
const bob = new Wallet()
const alice = new Wallet()

satoshi.sendMoney(50, bob.publicKey)
bob.sendMoney(23, alice.publicKey)
alice.sendMoney(5, bob.publicKey)

console.log(Chain.instance)
