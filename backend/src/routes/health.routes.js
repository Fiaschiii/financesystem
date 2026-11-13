import { Router } from 'express'
import { isSupabaseConfigured, supabase } from '../config/supabase.js'
import { healthDbLimiter } from '../middlewares/rateLimits.js'

const router = Router()

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Backend do Controle Financeiro está no ar',
    timestamp: new Date().toISOString(),
  })
})

// Consulta o banco sem exigir login: limite próprio, bem mais baixo.
router.get('/supabase', healthDbLimiter, async (req, res) => {
  if (!isSupabaseConfigured) {
    return res.json({
      configured: false,
      message: 'Preencha SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY em backend/.env',
    })
  }

  try {
    const { error } = await supabase.from('categories').select('id').limit(1)

    if (error) {
      return res.json({
        configured: true,
        reachable: false,
        error: error.message,
      })
    }

    res.json({ configured: true, reachable: true })
  } catch (error) {
    res.json({
      configured: true,
      reachable: false,
      error: error.message,
    })
  }
})

export default router