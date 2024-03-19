import express from 'express'
// import { Chain, Wallet } from './chain2/blockchan'
import { Blockchain } from './cahin1/blockchain'
import { Chain, Wallet } from './chain2/blockchan'

const app = express()

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

async function startServer() {
  try {
    const blockchain = new Blockchain()
    await blockchain.initializeBlockchain()

    app.use(express.json())

    app.post('/chain1', async (req, res) => {
      const satoshi = new Wallet()
      const bob = new Wallet()
      const alice = new Wallet()

      satoshi.sendMoney(50, bob.publicKey)
      bob.sendMoney(23, alice.publicKey)
      alice.sendMoney(5, bob.publicKey)

      console.log(Chain.instance)

      console.log('Carteira de Satoshi:', satoshi)
      console.log('Carteira de Bob:', bob)
      console.log('Carteira de Alice:', alice)

      res.json(Chain.instance)
    })

    app.post('/', async (req, res) => {
      console.log('Requisição recebida', req.body)

      const dificuldade = req.body.dificuldade
      const numBlocos = req.body.numBlocos

      let chain = blockchain.chain

      for (let i = 0; i < numBlocos; i++) {
        console.log(`Minerando bloco ${i}...`)
        const bloco = blockchain.criarBloco(`Bloco ${i}`)
        const mineInfo = blockchain.minerarBloco(bloco)
        chain.push(mineInfo.blocoMinerado) // Adiciona o bloco minerado à cadeia existente

        // Insere os dados do bloco na tabela blockchain
        const inserirBlocoQuery =
          'INSERT INTO blockchain (nonce, hashBloco, sequencia, timestamp, dados, hashAnterior) VALUES (?, ?, ?, ?, ?, ?)'
        const blocoData = [
          mineInfo.blocoMinerado.header.nonce,
          mineInfo.blocoMinerado.header.hashBloco,
          bloco.sequencia,
          bloco.timestamp,
          bloco.dados,
          bloco.hashAnterior
        ]

        connection.query(inserirBlocoQuery, blocoData, (err: any, results: any, fields: any) => {
          if (err) {
            console.error('Erro ao inserir bloco:', err)
          } else {
            console.log('Bloco inserido com sucesso:', results.insertId)
          }
        })
      }

      const allBlocksQuery = 'SELECT * FROM blockchain'

      const allBlocks = await new Promise((resolve, reject) => {
        connection.query(allBlocksQuery, (err: any, results: any, fields: any) => {
          if (err) {
            console.error('Erro ao buscar todos os blocos:', err)
            reject(err)
          } else {
            console.log('Todos os blocos:', results)
            resolve(results)
          }
        })
      })

      console.log('--- Blockchain ---')
      console.table(allBlocks)

      res.json(allBlocks)
    })
    app.get('/nova-carteira', (req: any, res) => {
      const carteira = blockchain.criarCarteira()

      res.json(carteira)
    })

    app.post('/transacao', async (req: any, res) => {
      // cria uma carteira para o usuário
      const valor = req.body.valor as number
      const destinatario = req.body.destinatario as string
      const publickey = req.body.publickey as string
      const privateKey = req.body.privateKey as string

      const chain = blockchain.enviarDinheiro(valor, destinatario, publickey, privateKey)

      const inserirBlocoQuery =
        'INSERT INTO blockchain (nonce, hashBloco, sequencia, timestamp, dados, hashAnterior) VALUES (?, ?, ?, ?, ?, ?)'
      const blocoData = [
        chain.blocoMinerado.header.nonce,
        chain.blocoMinerado.header.hashBloco,
        chain.blocoMinerado.payload.sequencia,
        chain.blocoMinerado.payload.timestamp,
        chain.blocoMinerado.payload.dados,
        chain.blocoMinerado.payload.hashAnterior
      ]

      console.log('--- Blockchain ---')
      console.table(blocoData)

      connection.query(inserirBlocoQuery, blocoData, (err: any, results: any, fields: any) => {
        if (err) {
          console.error('Erro ao inserir bloco:', err)
        } else {
          console.log('Bloco inserido com sucesso:', results.insertId)
        }
      })

      const allBlocksQuery = 'SELECT * FROM blockchain'

      const allBlocks = await new Promise((resolve, reject) => {
        connection.query(allBlocksQuery, (err: any, results: any, fields: any) => {
          if (err) {
            console.error('Erro ao buscar todos os blocos:', err)
            reject(err)
          } else {
            console.log('Todos os blocos:', results)
            resolve(results)
          }
        })
      })

      // console.log('--- Blockchain ---')
      // console.table(allBlocks)

      res.json(allBlocks)
    })

    app.listen(3000, () => {
      console.log('Servidor rodando na porta 3000')
    })
  } catch (error) {
    console.error('Erro ao iniciar o servidor:', error)
  }
}

startServer()
