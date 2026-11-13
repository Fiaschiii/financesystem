import 'dotenv/config'
import http from 'node:http'
import app from './app.js'

const PORT = process.env.PORT || 3000

// Prazos das conexões (Etapa 17). Seguram o ataque "slowloris": abrir muitas
// conexões e mandar a requisição bem devagar, um byte por vez, para ocupar o
// servidor sem nunca terminar. Requisições desta API levam milissegundos.
const server = http.createServer(
  {
    headersTimeout: 10_000, // cabeçalhos completos em até 10 s
    requestTimeout: 30_000, // requisição inteira (com o corpo) em até 30 s
    keepAliveTimeout: 5_000, // conexão ociosa é fechada depois de 5 s
    // De quanto em quanto tempo o Node confere os prazos acima. O padrão
    // (30 s) deixaria uma conexão lenta viva bem mais que os 10 s.
    connectionsCheckingInterval: 2_000,
  },
  app
)

server.listen(PORT, () => {
  console.log(`✅ Backend rodando em http://localhost:${PORT}`)
})
