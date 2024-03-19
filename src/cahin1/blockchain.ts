import { createHash, createVerify, generateKeyPairSync, sign } from 'crypto'
import { hash, hashValidado } from './helpers'

export interface Bloco {
  header: {
    nonce: number
    hashBloco: string
  }
  payload: {
    sequencia: number
    timestamp: number
    dados: any
    hashAnterior: string
  }
}

export interface BuscaBloco {
  id: number
  hashBloco: string
  sequencia: number
  timestamp: string
  dados: string
  hashAnterior: string
  nonce: number
  create_at: Date
}

const mysql = require('mysql')

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'blockchain'
})

connection.connect((err: any) => {
  if (err) {
    console.log('Erro ao conectar ao banco de dados', err)
  } else {
    console.log('Conexão com o banco de dados estabelecida')
  }
})

export class Blockchain {
  #chain: Bloco[] = []
  private prefixoPow: string = '0'

  constructor(private dificuldade: number = 4) {
    this.initializeBlockchain() // Inicia a inicialização da blockchain, mas não espera que ela seja concluída
  }

  async initializeBlockchain() {
    try {
      const blocoGenesis = await this.getBlocoGenesis()
      this.#chain.push(blocoGenesis)
      console.log('Blockchain inicializada:', this.#chain)
    } catch (error) {
      console.error('Erro ao inicializar blockchain:', error)
      // Tratar erro, se necessário
    }
  }

  async getBlocoGenesis(): Promise<Bloco> {
    console.log('Buscando bloco genesis')

    return new Promise((resolve, reject) => {
      connection.query(
        'SELECT * FROM blockchain WHERE id = (SELECT MAX(id) FROM blockchain)',
        (err: any, results: any) => {
          if (err) {
            console.error('Erro ao buscar bloco genesis:', err)
            reject(err)
          } else {
            console.log('Resultados da consulta:', results)
            if (results.length === 0) {
              console.log('Bloco genesis não encontrado')
              const blocoGenesis = this.criarBlocoGenesis()
              resolve(blocoGenesis)
            } else {
              console.log('Bloco genesis encontrado:', results[0])
              const blocoGenesis = {
                header: {
                  nonce: results[0].nonce,
                  hashBloco: results[0].hashBloco
                },
                payload: {
                  sequencia: results[0].sequencia,
                  timestamp: parseInt(results[0].timestamp),
                  dados: results[0].dados,
                  hashAnterior: results[0].hashAnterior
                }
              }
              resolve(blocoGenesis)
            }
          }
        }
      )
    })
  }

  private criarBlocoGenesis(): Bloco {
    console.log('Criando bloco genesis')
    console.log('======================================================')
    const payload: Bloco['payload'] = {
      sequencia: 0,
      timestamp: Date.now(),
      dados: 'Bloco Genesis',
      hashAnterior: ''
    }

    console.log(`Bloco genesis criado: ${JSON.stringify(payload)}`)

    const inserirBlocoQuery =
      'INSERT INTO blockchain (nonce, hashBloco, sequencia, timestamp, dados, hashAnterior) VALUES (?, ?, ?, ?, ?, ?)'

    connection.query(
      inserirBlocoQuery,
      [0, hash(JSON.stringify(payload)), 0, payload.timestamp, payload.dados, payload.hashAnterior],
      (err: any, results: any, fields: any) => {
        if (err) {
          console.error('Erro ao inserir bloco genesis:', err)
        } else {
          console.log('Bloco genesis inserido com sucesso:', results.insertId)
        }
      }
    )

    return {
      header: {
        nonce: 0,
        hashBloco: hash(JSON.stringify(payload))
      },
      payload
    }
  }

  get chain(): Bloco[] {
    return this.#chain
  }

  private get ultimoBloco(): Bloco {
    return this.#chain[this.#chain.length - 1]
  }

  private getHashUltimoBloco(): string {
    return this.ultimoBloco.header.hashBloco
  }

  criarBloco(dados: any): Bloco['payload'] {
    const novoBloco: Bloco['payload'] = {
      sequencia: this.ultimoBloco.payload.sequencia + 1,
      timestamp: Date.now(),
      dados,
      hashAnterior: this.getHashUltimoBloco()
    }

    console.log(`Bloco criado: ${JSON.stringify(novoBloco)}`)
    return novoBloco
  }

  minerarBloco(bloco: Bloco['payload']) {
    let nonce = 0
    let inicio = Date.now()

    console.log(`======================================================`)
    while (true) {
      const hashBloco = hash(JSON.stringify(bloco))
      const hashPow = hash(hashBloco + nonce)

      if (
        hashValidado({
          hash: hashPow,
          prefixo: this.prefixoPow,
          dificuldade: this.dificuldade
        })
      ) {
        const final = Date.now()
        const hashReduzido = hashBloco.slice(0, 12)
        const tempoMineracao = (final - inicio) / 1000

        console.log(`Tempo de mineração: ${tempoMineracao} segundos - ${hashReduzido} ... tentativas - ${nonce}`)
        console.log(`Bloco minerado: ${hashBloco}`)
        return {
          blocoMinerado: { payload: { ...bloco }, header: { nonce, hashBloco } },
          hashPow,
          hashReduzido,
          tempoMineracao
        }
      }
      nonce++
    }
  }

  verificarBloco(bloco: Bloco): boolean {
    if (bloco.payload.hashAnterior !== this.getHashUltimoBloco()) {
      console.error(
        `Hash do bloco anterior inválido: ${JSON.stringify(
          bloco.payload.hashAnterior.slice(0, 12)
        )} != ${JSON.stringify(this.getHashUltimoBloco().slice(0, 12))}`
      )
      return false
    }

    if (
      !hashValidado({
        hash: hash(hash(JSON.stringify(bloco.payload)) + bloco.header.nonce),
        prefixo: this.prefixoPow,
        dificuldade: this.dificuldade
      })
    ) {
      console.error(`Hash do bloco não validado: ${JSON.stringify(bloco.header.hashBloco)}`)
      return false
    }

    console.log(`Bloco validado: ${JSON.stringify(bloco, null, 2)}`)
    return true
  }

  enviarBloco(bloco: Bloco): Bloco[] {
    console.log(`Verificando bloco #${JSON.stringify(bloco, null, 2)}`)
    if (this.verificarBloco(bloco)) {
      this.#chain.push(bloco)
      console.log(`Pushed block #${JSON.stringify(this.#chain, null, 2)}`)
    }
    return this.#chain
  }

  criarCarteira() {
    const keypair = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    })

    return { publicKey: keypair.publicKey, privateKey: keypair.privateKey }
  }

  enviarDinheiro(valor: number, destinatario: string, publicKey: string, privateKey: string) {
    const transacao = new Wallet(publicKey, privateKey).sendMoney(valor, destinatario)

    console.log(`Transação criada: ${JSON.stringify(transacao)}`)

    const bloco = this.criarBloco(JSON.stringify(transacao))
    const mineInfo = this.minerarBloco(bloco)
    this.#chain.push(mineInfo.blocoMinerado)
    return mineInfo
  }
}

class Wallet {
  public publicKey: string
  public privateKey: string

  constructor(publicKey: string, privateKey: string) {
    if (publicKey && privateKey) {
      this.publicKey = publicKey
      this.privateKey = privateKey
    } else {
      const keypair = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      })

      this.publicKey = keypair.publicKey
      this.privateKey = keypair.privateKey
    }
  }

  sendMoney(valor: number, destinatario: string) {
    const transacao = new Transacao(this.publicKey, destinatario, valor)

    const assinatura = sign('sha256', Buffer.from(transacao.toString()), this.privateKey)

    return { transacao, assinatura }
  }
}

class Transacao {
  constructor(public remetente: string, public destinatario: string, public valor: number) {}

  toString() {
    return JSON.stringify(this)
  }
}
