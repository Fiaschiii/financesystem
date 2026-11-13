import rateLimit from 'express-rate-limit'

// Limites de requisições (Etapa 17). Cada um segura um tipo de abuso:
//
// - burstLimiter:        rajada — muitas requisições em 1 minuto vindas do mesmo IP;
// - ipLimiter:           volume — muitas requisições em 15 minutos do mesmo IP;
// - authFailureLimiter:  tokens inválidos — quem fica testando tokens (cada
//                        tentativa custa uma consulta ao Supabase);
// - healthDbLimiter:     a rota de teste do banco, a única que consulta o
//                        Supabase sem exigir login;
// - userWriteLimiter:    gravações (POST/PUT/DELETE) por usuário logado, mesmo
//                        que ele troque de IP.
//
// Os números são bem acima do uso normal de uma pessoa e podem ser ajustados
// no backend/.env. Os contadores ficam na memória do processo: reiniciar o
// backend zera tudo (suficiente para um servidor só).

const MINUTE = 60 * 1000

function envNumber(name, fallback) {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

// Resposta 429 padronizada: mensagem em português e quantos segundos esperar
// (no corpo e no cabeçalho Retry-After).
function tooManyRequests(message) {
  return (req, res, next, options) => {
    const resetTime = req.rateLimit?.resetTime
    const retryAfter = resetTime
      ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
      : Math.ceil(options.windowMs / 1000)

    res.set('Retry-After', String(retryAfter))
    res.status(options.statusCode).json({ error: message, code: 'rate_limited', retryAfter })
  }
}

const GENERIC_MESSAGE = 'Muitas requisições em pouco tempo. Aguarde um pouco e tente de novo.'

function limiter({ windowMs, limit, message = GENERIC_MESSAGE, ...rest }) {
  return rateLimit({
    windowMs,
    limit,
    // Os cabeçalhos RateLimit (quanto ainda resta) saem só do limite geral,
    // o ipLimiter: se todos mandassem, o último sobrescreveria os outros.
    standardHeaders: false,
    legacyHeaders: false,
    handler: tooManyRequests(message),
    ...rest,
  })
}

export const burstLimiter = limiter({
  windowMs: MINUTE,
  limit: envNumber('RATE_LIMIT_BURST', 60),
})

export const ipLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: envNumber('RATE_LIMIT_MAX', 300),
  standardHeaders: 'draft-7',
})

// Só conta as respostas 401 (token ausente, inválido ou expirado). Quem
// usa o sistema normalmente quase nunca recebe 401: o frontend renova o
// token sozinho.
export const authFailureLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: envNumber('RATE_LIMIT_AUTH_FAILURES', 30),
  skipSuccessfulRequests: true,
  requestWasSuccessful: (req, res) => res.statusCode !== 401,
  message: 'Muitas tentativas com login inválido. Aguarde alguns minutos e entre de novo.',
})

export const healthDbLimiter = limiter({
  windowMs: MINUTE,
  limit: envNumber('RATE_LIMIT_HEALTH_DB', 10),
})

// Roda depois do requireAuth, então a chave é o usuário, não o IP.
export const userWriteLimiter = limiter({
  windowMs: MINUTE,
  limit: envNumber('RATE_LIMIT_WRITES', 30),
  skip: (req) => req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS',
  keyGenerator: (req) => `user:${req.user.id}`,
  message: 'Muitas alterações em pouco tempo. Aguarde um minuto e tente de novo.',
})
