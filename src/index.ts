import express from 'express'
// import { Chain, Wallet } from './chain2/blockchan'
import { Chain, Wallet } from './blockchan'

const app = express()

// const mysql = require('mysql')

// const connection = mysql.createConnection({
//   host: 'localhost',
//   user: 'root',
//   password: 'root',
//   database: 'blockchain'
// })

// connection.connect((err: any) => {
//   if (err) {
//     console.log('Erro ao conectar ao banco de dados', err)
//   } else {
//     console.log('Conexão com o banco de dados estabelecida')
//   }
// })

async function startServer() {
  try {
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

    app.listen(3000, () => {
      console.log('Servidor rodando na porta 3000')
    })
  } catch (error) {
    console.error('Erro ao iniciar o servidor:', error)
  }
}

startServer()
