import { Blockchain } from '../cahin1/blockchain'

const dificuldade = Number(process.argv[2] || 4)
const blockcahin = new Blockchain(dificuldade)

let numBlocos = +process.argv[3] || 10
let chain = blockcahin.chain

for (let i = 0; i < numBlocos; i++) {
  console.log(`Minerando bloco ${i}...`)
  const bloco = blockcahin.criarBloco(`Bloco ${i}`)
  const mineInfo = blockcahin.minerarBloco(bloco)
  chain = blockcahin.enviarBloco(mineInfo.blocoMinerado)
}

console.log('--- Blockchain ---')
console.table(chain.map(({ header, payload }) => ({ ...header, ...payload })))
