import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import healthRoutes from './routes/health.routes.js'
import authRoutes from './routes/auth.routes.js'
import financeRoutes from './routes/finance.routes.js'
import categoryRoutes from './routes/category.routes.js'
import expenseRoutes from './routes/expense.routes.js'
import budgetRoutes from './routes/budget.routes.js'
import profileRoutes from './routes/profile.routes.js'
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js'
import { burstLimiter, ipLimiter, authFailureLimiter } from './middlewares/rateLimits.js'
import { localizeResponses } from './utils/i18n.js'

const app = express()

// Atrás de um proxy (Nginx, Render, Railway...), todo mundo chegaria com o IP
// do proxy e dividiria o mesmo limite. TRUST_PROXY=1 faz o Express ler o IP
// real no X-Forwarded-For. Sem proxy, deixe vazio: senão qualquer um inventa
// um IP novo a cada requisição e escapa do limite.
const trustProxy = Number(process.env.TRUST_PROXY)
if (Number.isInteger(trustProxy) && trustProxy > 0) {
  app.set('trust proxy', trustProxy)
}

// Cabeçalhos de segurança (bloqueia o uso da API dentro de iframes, desliga
// o "X-Powered-By: Express", força o navegador a respeitar o Content-Type etc.).
app.use(helmet())

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }))

// Verificação de saúde da hospedagem (o Render chama de tempos em tempos para
// saber se o servidor está no ar). Fica antes dos limites: não gasta a cota
// de ninguém e não consulta o banco.
app.get('/healthz', (req, res) => res.json({ status: 'ok' }))

// Mensagens de erro no idioma da pessoa (Accept-Language). Fica antes de
// tudo que pode responder com erro, inclusive os limites abaixo.
app.use('/api', localizeResponses)

// Limites de requisições (Etapa 17; detalhes em middlewares/rateLimits.js).
// Ficam antes da leitura do corpo e da validação do token: quem passou do
// limite é barrado sem gastar processamento nem consulta ao Supabase.
app.use('/api', burstLimiter, ipLimiter, authFailureLimiter)

// Os corpos desta API são pequenos (um gasto, um salário): 10 kB sobra.
app.use(express.json({ limit: '10kb' }))

app.use('/api/health', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/finance', financeRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/budgets', budgetRoutes)
app.use('/api/profile', profileRoutes)

// Sempre por último: rota inexistente e tratamento central de erros.
app.use('/api', notFoundHandler)
app.use(errorHandler)

export default app
